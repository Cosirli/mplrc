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

const currLyricsFile = process.env.HOME + "/.config/waybar/lyric.txt"
const musicDir = process.env.HOME + "/media/Music"
const lyricsDir = path.join(musicDir, ".lyrics")

childProcess.spawn('cp', ['mplrc.sh', process.env.HOME + '/.config/waybar/'])
main()


async function main() {
  await recurIndex(musicDir)

  setInterval(() => {
    const s = childProcess.spawn('mpc', ['status'])
    s.stdout.on('data', async (data) => {
      let text = td.decode(data)
      if (text.split("\n").length === 2) {
        fs.writeFile(currLyricsFile, "null")
        console.log("Write to", currLyricsFile, "null")
        return
      }
      if (td.decode(data).includes("n/a")) {
        fs.writeFile(currLyricsFile, "null")
        console.log("Write to", currLyricsFile, "null")
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
          console.log("L", l)
        }
        lmap.set(title, lrc)
      }

      if (compare(elapsed, lrc[0].time) === -1) {
        fs.writeFile(currLyricsFile, "「" + title + "」")
        console.log("g Write to", currLyricsFile, "「" + title + "」")
      } else if (compare(elapsed, lrc[lrc.length - 1].time) === 1) {
        fs.writeFile(currLyricsFile, lrc[lrc.length - 1].text + "󰝚 󰝚 󰝚 ")
        console.log("G Write to", currLyricsFile, lrc[lrc.length - 1].text + "󰝚 󰝚 󰝚 ")
      } else {
        for (let i = 0; i < lrc.length - 1; i++) {
          let j = i + 1;
          console.log("i:", i)
          if (compare(elapsed, lrc[i].time) !== -1 && compare(elapsed, lrc[j].time) !== 1) {
            if (compare(lrc[i].time, lrc[j].time) === 0) {
              console.log("skip")
              continue
            }
            if (lrc[i].text.trim()) {
              fs.writeFile(currLyricsFile, lrc[i].text)
              console.log("Write to", currLyricsFile, lrc[i].text)
            } else {
              fs.writeFile(currLyricsFile, "󰝚 󰝚 󰝚 󰝚 󰝚 󰝚 󰝚 󰝚 󰝚 ")
              console.log("Write to", currLyricsFile, "󰝚 󰝚 󰝚 󰝚 󰝚 󰝚 󰝚 󰝚 󰝚 ")
            }
            break
          }
        }
      }
    })
  }, 500)


  function compare(t1, t2) {
    console.log("compare")
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
  if (!s.isDirectory()) {
    try {
      const res = await mm.parseFile(path)
      const song_name = res.common.title.trim();
      map.set(song_name, path)
      console.log("indexed song:", path)
    } catch (error) {

    }
  } else {
    const items = await fs.readdir(path)
    for (const item of items) {
      const item_path = path + "/" + item
      const s = await fs.stat(item_path)
      if (s.isDirectory()) {
        await recurIndex(item_path)
      } else if (s.isFile()) {
        try {
          const res = await mm.parseFile(item_path)
          const song_name = res.common.title.trim();
          map.set(song_name, item_path)
          console.log("indexed song:", item_path)
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
  console.log("pairsArray: ", pairsArray)
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
  console.log("pair: ", pair)
  return pair
}

