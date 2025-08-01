## mplrc: Waybar Lyrics for MPD

`mplrc` is a minimalist Waybar module that displays synchronized lyrics for tracks played via MPD. It is simple, configurable and lightweight.

### Features

* **Real-time lyrics**: Fetches and displays synchronized lyrics from specified directory.
* **Configurable paths**: Easily adjust your music and lyrics directories via command-line arguments.
* **Debug support**: Enable verbose logging for troubleshooting.


### Requirements

   * [Node.js](https://nodejs.org/) (with `npm`)
   * [`mpc`](https://www.musicpd.org/clients/mpc/) (Music Player Client)


### Installation

```bash
# Clone and install globally
git clone https://github.com/Cosirli/mplrc.git
cd mplrc
sudo npm install -g
```

This installs the `mplrc` tool globally.


### Configuration


#### 1. **Customize Music and Lyrics Paths**

`mplrc` allows you to specify custom paths for your music and lyrics directories. You can pass these as command-line arguments when running `mplrc`:

* `--mus`: Set your custom music directory.
* `--lrc`: Set your custom lyrics directory.

##### Example:

```bash
mplrc --mus=/path/to/your/music --lrc=/path/to/your/lyrics
```

If you don't specify the paths, the following defaults will be used:

* **Music Directory**: `~/Music`
* **Lyrics Directory**: `/path/to/your/music/.lyrics`


#### 2. Waybar Module Setup

Add this to `~/.config/waybar/config`:

```json
{
  "modules-left": ["mpd"],
  "modules-center": ["custom/mplrc"],
  "custom/mplrc": {
    "exec": "/home/USER/.config/waybar/mplrc.sh",
  }
}
```


### Usage

Once configured, you can start using `mplrc`:

**Run `mplrc` from the terminal**:

  You can run it with custom arguments for music and lyrics directories or use the defaults.

**Autostart on Launch**

  To have `mplrc` start automatically when you launch your compositor, add a autostart command in your compositor's config.  
  Example for *sway*:

  ```bash
  exec_always mplrc --mus=/home/Cosirli/media/Music
  ```


#### Debugging

  If you're encountering issues, enable verbose logging to troubleshoot:

  ```bash
  mplrc -DEBUG
  ```


### Contributing

Contributions and feature requests are welcome! Feel free to open an issue or submit a pull request.


### Acknowledgements

This project is inspired by [hyric](https://github.com/YUxiangLuo/hyric). Thanks for the original implementation and inspiration!


### License

**GNU General Public License v3.0**

---

© 2025 mplrc

