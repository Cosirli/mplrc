#!/usr/bin/env node
// @author Cosirli

import mm from "music-metadata"
import fs from "node:fs/promises"
import childProcess from "node:child_process"
import path from "node:path"
import util from "node:util"

const td = new util.TextDecoder()
const map = new Map()  // map found music
const lmap = new Map() // map found lyrics

let LOGGING_ENABLED = false
const args = process.argv.slice(2)
if (args.includes('-DEBUG')) {
  LOGGING_ENABLED = true
}
function log(...messages) {
  if (LOGGING_ENABLED) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${messages.join(' ')}`);
  }
}

const currLyricsFile = process.env.HOME + "/.config/waybar/lyric.txt"
const musicDir = process.env.HOME + "/media/Music"
const lyricsDir = path.join(musicDir, ".lyrics")

childProcess.spawn('cp', ['mplrc.sh', process.env.HOME + '/.config/waybar/'])
let writtenLyrics = ""
main()


async function main() {
  await recurIndex(musicDir)

  setInterval(() => {
    const s = childProcess.spawn('mpc', ['status'])
    s.stdout.on('data', async (data) => {
      let text = td.decode(data)
      if (text.split("\n").length === 2 || td.decode(data).includes("n/a")) {
        writtenLyrics = "null"
        return
      }

      let musicInfo = text.split("\n")[0]
      let elapsed = text.split("\n")[1].split("/")[1].split(" ")[3]
      let title = musicInfo.substring(musicInfo.indexOf("-") + 2, musicInfo.length).trim()
      let musicPath = map.get(title)
      if (!musicPath) {
        await recurIndex(musicDir)
        musicPath = map.get(title)
      }
      let lrc = lmap.get(title)
      if (!lrc) {
        lrc = await getCurrentLyrics(musicPath)
        for (let l of lrc) {
          log("Lyrics mapped:", l.time, l.text)
        }
        lmap.set(title, lrc)
      }

      let currLyrics = ""
      if (compare(elapsed, lrc[0].time) === -1) {
        currLyrics = "「" + title + "」"
      } else if (compare(elapsed, lrc[lrc.length - 1].time) === 1) {
        currLyrics = lrc[lrc.length - 1].text + "󰝚 󰝚 󰝚 "
      } else {
        for (let i = 0; i < lrc.length - 1; i++) {
          let j = i + 1;
          if (compare(elapsed, lrc[i].time) !== -1 && compare(elapsed, lrc[j].time) !== 1) {
            if (compare(lrc[i].time, lrc[j].time) === 0) {
              log("skip")
              continue
            }
            currLyrics = lrc[i].text.trim() ? lrc[i].text.trim() : "󰝚 󰝚 󰝚 󰝚 󰝚 󰝚 󰝚 "
            break
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
  if (s.isFile()) {
    try {
      const res = await mm.parseFile(path)
      const title = res.common.title.trim();
      map.set(title, path)
      log("indexed music:", title, "path:", path)
    } catch (error) {

    }
  } else {
    const items = await fs.readdir(path)
    for (const item of items) {
      const itemPath = path + "/" + item
      const s = await fs.stat(itemPath)
      if (s.isDirectory()) {
        await recurIndex(itemPath)
      } else if (s.isFile()) {
        try {
          const res = await mm.parseFile(itemPath)
          const title = res.common.title.trim();
          map.set(title, itemPath)
          log("indexed music:", title, "path:", itemPath)
        } catch (error) {

        }
      }
    }
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
    rawLyrics = await fs.readFile(lrcPath, 'utf-8')
  } catch {
    // file not found, fallback to metadata
    const res = await mm.parseFile(songPath)
    const arr = res.common.lyrics || []
    if (arr.length == 0) return []
    rawLyrics = arr[0]
  }

  const pairsArray = rawLyrics
    .split(/\r?\n/)
    .map(generateTimeTextPair)
    .filter(x => x !== null);
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

