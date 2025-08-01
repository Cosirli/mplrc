#!/usr/bin/env node
// @author Cosirli
import mm from "music-metadata"
import fs from "node:fs/promises"
import childProcess from "node:child_process"
import path from "node:path"
import util from "node:util"


const args = process.argv.slice(2)

const musicDir = args.find(arg =>
  arg.startsWith('--mus='))?.split('=')[1] || process.env.HOME + "/Music"
const lyricsDir = args.find(arg =>
  arg.startsWith('--lrc='))?.split('=')[1] || path.join(musicDir, ".lyrics")
const currLyricsFile = process.env.HOME + "/.config/waybar/lyric.txt"
const LOGGING_ENABLED = args.includes('-DEBUG')

function log(...messages) {
  if (LOGGING_ENABLED) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${messages.join(' ')}`);
  }
}

const td = new util.TextDecoder()
const musicMap = new Map()  // map found music
const lyricMap = new Map()  // map found lyrics

childProcess.spawn('cp', ['mplrc.sh', process.env.HOME + '/.config/waybar/'])
let writtenLyrics = ""
main()


async function main() {
  await recurIndex(musicDir)

  setInterval(() => {
    const s = childProcess.spawn('mpc', ['-f', '%title% - %artist% - %album%', 'status'])
    s.stdout.on('data', async (data) => {
      let text = td.decode(data)
      if (text.split("\n").length === 2 || td.decode(data).includes("n/a")) {
        writtenLyrics = "null"
        return
      }

      let musicInfo = text.split("\n")[0].trim()
      let elapsed = text.split("\n")[1].match(/^.*\/\d+\s+(\d+:\d+).*$/)[1]
      let lrc = lyricMap.get(musicInfo)
      if (!lrc) {
        let path = musicMap.get(musicInfo)
        if (!path) {
          await recurIndex(musicDir)
          path = musicMap.get(musicInfo)
        }
        log("musicPath:", path)
        lrc = await getCurrentLyrics(path)
        for (let l of lrc) {
          log("Lyrics mapped:", l.time, l.text)
        }
        lyricMap.set(musicInfo, lrc)
      }

      let currLyrics = ""
      if (lrc.length === 0) {
        log("No lyrics available for", musicInfo);
        currLyrics = "No Lyrics";
      } else {
        const len = lrc.length
        if (compare(elapsed, lrc[0].time) === -1) {
          currLyrics = " 󰝚 󰝚 󰝚 "
        } else if (compare(elapsed, lrc[len - 1].time) === 1) {
          const i = len - 1
          currLyrics = lrc[i].text.trim() ? lrc[i].text.trim() : " 󰝚 󰝚 󰝚 "
        } else {
          for (let i = 0; i < lrc.length - 1; i++) {
            let j = i + 1;
            if (compare(elapsed, lrc[i].time) !== -1 && compare(elapsed, lrc[j].time) !== 1) {
              if (compare(lrc[i].time, lrc[j].time) === 0) {
                log("skip")
                continue
              }
              currLyrics = lrc[i].text.trim() ? lrc[i].text.trim() : " 󰝚 󰝚 󰝚 󰝚 󰝚 󰝚 "
              break
            }
          }
        }
      }

      if (currLyrics !== writtenLyrics) {
        fs.writeFile(currLyricsFile, currLyrics)
        log("Write to", currLyricsFile, currLyrics)
        writtenLyrics = currLyrics
      }
    })
  }, 500)


  function compare(t1, t2) {
    // log("compare")
    let [t1x, t1y] = t1.split(":").map(x => parseInt(x))
    let [t2x, t2y] = t2.split(":").map(x => parseInt(x))
    if (t1x < t2x) return -1;
    else if (t1x > t2x) return 1;
    else {
      if (t1y < t2y) {
        return -1;
      } else if (t1y > t2y) {
        return 1;
      } else {
        return 0;
      }
    }
  }

}

async function recurIndex(path) {
  const s = await fs.stat(path)
  if (s.isDirectory()) {
    const items = await fs.readdir(path)
    for (let item of items) {
      const itemPath = path + "/" + item
      await recurIndex(itemPath)
    }
  } else if (s.isFile()) {
    await indexMusicFile(path)
  }
}

async function indexMusicFile(path) {
  try {
    const res = await mm.parseFile(path)
    const title = res.common.title.trim()
    const artist = res.common.artist.trim()
    const album = res.common.album.trim()
    const musicInfo = [title, artist, album].map(s => s.trim()).join(" - ")
    musicMap.set(musicInfo, path)
    log("indexed music:", musicInfo, "path:", path)
  } catch (error) {

  }
}


/**
 * Attempts to load LRC lyrics for a song:
 * 1. Look for a .lrc file in $HOME/media/Music/.lyrics with the same basename.
 * 2. If not found, fall back to embedded metadata.
 * Returns an array of { time, text } objects
 */
async function getCurrentLyrics(songPath, opts = {}) {
  const lrcDir = opts.lrcDir || lyricsDir
  const baseName = path.basename(songPath, path.extname(songPath)) // ext removd
  const lrcPath = path.join(lrcDir, baseName + '.lrc')

  let rawLyrics = ''
  try {
    log("Lyrics file:", lrcPath)
    rawLyrics = await fs.readFile(lrcPath, 'utf-8')
  } catch {
    // file not found, fallback to metadata
    log("Lyrics file not found, checking metadata...")
    const res = await mm.parseFile(songPath)
    const arr = res.common.lyrics || []
    if (arr.length == 0) {
      log("No lyrics in metadata")
      return []
    }
    rawLyrics = arr[0]
  }

  const pairsArray = rawLyrics
    .split(/\r?\n/)
    .map(generateTimeTextPair)
    .filter(pair => pair !== null && pair.time);
  log("pairsArray:\n   ", pairsArray.map(JSON.stringify).join('\n    '))
  return pairsArray
}

function generateTimeTextPair(line) {
  const match = line.match(/^\s*\[([^\]]+)\]\s*(.*)$/)
  if (!match) {
    return null
  }
  const time = match[1].split(".")[0]
  const text = match[2].trim()
  let pair = {
    time: time,
    text: text
  }
  return pair
}


