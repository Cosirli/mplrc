## mplrc: Waybar Lyrics for MPD

`mplrc` is a minimalist Waybar module that displays synchronized lyrics for tracks played via MPD. It is simple, configurable and lightweight.

---

### Features

* **Real-time lyrics**: Fetches and displays synchronized lyrics from specified directory.
* **Configurable paths**: Easily adjust your music and lyrics directories.
* **Debug support**: Enable verbose logging for troubleshooting.

---

### Requirements

   * [Node.js](https://nodejs.org/) (with `npm`)
   * [`mpc`](https://www.musicpd.org/clients/mpc/) (Music Player Client)

---

### Installation

```bash
# Clone and install globally
git clone https://github.com/Cosirli/mplrc.git
cd mplrc
sudo npm install -g
```

This installs the `mplrc` tool globally.

---

### Configuration

#### 1. Verify paths in `index.js`

Make sure these match your setup:

```js
const musicDir = process.env.HOME + "/media/Music"; // Your music folder
const lyricsDir = path.join(musicDir, ".lyrics");  // Your lyrics folder
```

#### 2. Waybar Module Setup

Add this to `~/.config/waybar/config`:

```json
{
  "modules-left": ["mpd"],
  "modules-center": ["custom/mplrc"],
  "custom/mplrc": {
    "exec": "/home/USER/.config/waybar/mplrc.sh",
    "restart-interval": 1,
  }
}
```


#### 3. Autostart on Launch

Add to your compositor config:

* **Sway**:

  ```bash
  exec_always --no-startup-id mplrc
  ```
* **Hyprland**:

  ```bash
  exec-once mplrc
  ```

---

### Debugging

  Enable debug logs by:

  ```bash
  mplrc --debug
  ```

---

### Contributing

Contributions and feature requests are welcome! Feel free to open an issue or submit a pull request.

---

### Acknowledgements

This project is inspired by [hyric](https://github.com/YUxiangLuo/hyric). Thanks for the original implementation and inspiration!

---

### License

**GNU General Public License v3.0**

---

© 2025 mplrc

