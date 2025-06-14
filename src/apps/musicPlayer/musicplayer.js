/*
 * musicplayer.js — Core logic for the Music Player application.
 * Handles song loading, playback controls (play/pause, skip, volume),
 * and updates the UI with song metadata and artwork.
 * @file src/apps/musicPlayer/musicplayer.js
 */

// ===== Music Player Module =====
window.MusicPlayer = {
  /**
   * Initializes the music player: sets up song data, DOM element references,
   * and event listeners for player controls.
   */
  init: function () {
    // ===== Configuration =====
    // --- Placeholder Song Data ---
    // IMPORTANT: You MUST update these paths to match your local files!
    // Audio files should be relative to musicplayer.html, e.g., '../../../../assets/apps/musicPlayer/audio/yourfile.mp3'
    // Art files should be relative to musicplayer.html, e.g., '../../../../assets/apps/musicPlayer/art/yourimage.webp'
    /**
     * @typedef {object} Song
     * @property {string} band - The name of the artist or band.
     * @property {string} song - The title of the song.
     * @property {string} filePath - Relative path to the audio file.
     * @property {string} artPath - Relative path to the album artwork image.
     */

    /** @type {Song[]} Array of song objects for the playlist. */
    const songData = [
      {
        band: "Chiddy Bang ft. Icona Pop",
        song: "Mind Your Manners",
        filePath: "../../../assets/apps/musicPlayer/audio/song2.mp3", // Relative to musicplayer.html
        artPath: "../../../assets/apps/musicPlayer/art/album2.webp", // Relative to musicplayer.html
      },
      {
        band: "Chance the Rapper",
        song: "Juice",
        filePath: "../../../assets/apps/musicPlayer/audio/song1.mp3", // Relative to musicplayer.html
        artPath: "../../../assets/apps/musicPlayer/art/album1.webp", // Relative to musicplayer.html
      },
      {
        band: "B.O.B. ft. Rivers Cuomo",
        song: "Magic",
        filePath: "../../../assets/apps/musicPlayer/audio/song3.mp3", // Relative to musicplayer.html
        artPath: "../../../assets/apps/musicPlayer/art/album3.webp", // Relative to musicplayer.html
      },
    ];
    // --- End Placeholder Song Data ---

    // ===== DOM Element References =====
    const playBtn = document.querySelector(".play-btn");
    const backBtn = document.querySelector(".skip-left");
    const forwardBtn = document.querySelector(".skip-right");
    const volUpBtn = document.querySelector(".vol-up");
    const volDownBtn = document.querySelector(".vol-down");
    const controlBtnOverlay = document.querySelector(".btn-overlay"); // Visual feedback for button presses
    const artworkEl = document.querySelector(".album-artwork");
    const songTitleEl = document.querySelector("#song-title");
    const artistNameEl = document.querySelector("#artist-name");

    // Single audio element for playback
    const audioPlayer = document.getElementById("audio-player");

    // ===== Player State =====
    /** @type {number} Index of the currently loaded or playing song in the `songData` array. */
    let currentSongIndex = 0;
    /** @type {boolean} Tracks whether audio is currently playing. */
    let isPlaying = false;

    // ===== Core Functions =====
    /**
     * Loads a song into the player based on its index in the `songData` array.
     * Updates the artwork, song title, artist name, and audio source.
     * If a song was previously playing, it attempts to continue playback.
     * @param {number} songIndex - The index of the song to load from `songData`.
     */
    function loadSong(songIndex) {
      if (!songData[songIndex]) {
        console.warn(`Song data not found for index: ${songIndex}`);
        return;
      }

      const currentTrack = songData[songIndex];

      // Update album artwork
      if (artworkEl && currentTrack.artPath) {
        artworkEl.style.backgroundImage = `url('${currentTrack.artPath}')`;
      } else if (artworkEl) {
        artworkEl.style.backgroundImage = ""; // Clear art if not available
      }

      // Update song title and artist name
      if (songTitleEl) {
        songTitleEl.innerText = currentTrack.song || "Unknown Song";
      }
      if (artistNameEl) {
        artistNameEl.innerText = currentTrack.band || "Unknown Artist";
      }

      // Update audio source and load it
      if (audioPlayer && currentTrack.filePath) {
        audioPlayer.src = currentTrack.filePath;
        audioPlayer.load(); // Important: load the new source
        // If a song was playing, continue playing the new one
        if (isPlaying) {
          audioPlayer
            .play()
            .catch((e) => console.error("Error playing audio after load:", e));
        }
        // Signal readiness for preloading
        if (
          window.parent &&
          window.parent.eventBus &&
          window.parent.EVENTS &&
          window.parent.EVENTS.MUSIC_PLAYER_PRELOAD_READY
        ) {
          window.parent.eventBus.publish(
            window.parent.EVENTS.MUSIC_PLAYER_PRELOAD_READY,
            { programId: "musicPlayer" },
          );
        }
      } else if (audioPlayer) {
        audioPlayer.src = ""; // Clear src if no filepath
        console.warn("Audio file path not found for the current track.");
      }
    }

    /**
     * Toggles playback of the current song (play/pause).
     * If the audio source is not set, it loads the current song first.
     */
    function playPauseSong() {
      if (!audioPlayer) {
        console.error("Audio player element not found for play/pause.");
        return;
      }

      if (audioPlayer.paused || audioPlayer.ended) {
        // If src is not set (e.g., on initial load or if a previous song had no filePath), load current song.
        if (
          !audioPlayer.src &&
          songData[currentSongIndex] &&
          songData[currentSongIndex].filePath
        ) {
          loadSong(currentSongIndex); // This will also call audioPlayer.load()
        } else if (!audioPlayer.src) {
          console.warn(
            "Cannot play: No audio source loaded and no file path for current song.",
          );
          return;
        }

        audioPlayer
          .play()
          .then(() => {
            isPlaying = true;
            // Update play button icon to 'pause' (visual state)
            playBtn.classList.add("playing"); // Example: add a class to change icon via CSS
            // Publish event that music started playing
            if (
              window.parent &&
              window.parent.eventBus &&
              window.parent.EVENTS
            ) {
              window.parent.eventBus.publish(
                window.parent.EVENTS.MUSIC_PLAYER_PLAYING,
                { programId: "musicPlayer" },
              );
            } else {
              console.error(
                "[MusicPlayer] window.parent.eventBus or EVENTS not accessible for PLAYING.",
              );
            }
          })
          .catch((e) => console.error("Error attempting to play audio:", e));
      } else {
        audioPlayer.pause();
        isPlaying = false;
        // Update play button icon to 'play' (visual state)
        playBtn.classList.remove("playing"); // Example: remove class
        // Publish event that music stopped playing
        if (window.parent && window.parent.eventBus && window.parent.EVENTS) {
          window.parent.eventBus.publish(
            window.parent.EVENTS.MUSIC_PLAYER_STOPPED,
            { programId: "musicPlayer" },
          );
        } else {
          console.error(
            "[MusicPlayer] window.parent.eventBus or EVENTS not accessible for STOPPED (on pause).",
          );
        }
      }
    }

    // Add event listener for when the audio naturally ends
    if (audioPlayer) {
      audioPlayer.addEventListener("ended", () => {
        isPlaying = false;
        playBtn.classList.remove("playing");
        if (window.parent && window.parent.eventBus && window.parent.EVENTS) {
          window.parent.eventBus.publish(
            window.parent.EVENTS.MUSIC_PLAYER_STOPPED,
            { programId: "musicPlayer" },
          );
        } else {
          console.error(
            "[MusicPlayer] window.parent.eventBus or EVENTS not accessible for STOPPED (on ended).",
          );
        }
        // Optional: auto-play next song
        // currentSongIndex++;
        // if (currentSongIndex >= songData.length) currentSongIndex = 0;
        // loadSong(currentSongIndex);
        // playPauseSong();
      });
    }

    // ===== Event Listeners =====
    // --- Play/Pause Button ---
    if (playBtn) {
      playBtn.addEventListener("click", playPauseSong);

      // Visual feedback for button press
      playBtn.addEventListener("mousedown", function () {
        playBtn.classList.add("pressed");
      });
      playBtn.addEventListener("mouseup", function () {
        playBtn.classList.remove("pressed");
      });
      playBtn.addEventListener("mouseleave", function () {
        // Ensure 'pressed' is removed if mouse leaves while down
        playBtn.classList.remove("pressed");
      });
    } else {
      console.warn("Play button not found.");
    }

    // --- Back (Previous Song) Button ---
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        currentSongIndex--;
        if (currentSongIndex < 0) {
          currentSongIndex = songData.length - 1; // Loop to last song
        }
        loadSong(currentSongIndex);
      });

      // Visual feedback for button press
      backBtn.addEventListener("mousedown", function () {
        if (controlBtnOverlay) controlBtnOverlay.classList.add("left");
      });
      backBtn.addEventListener("mouseup", function () {
        if (controlBtnOverlay) controlBtnOverlay.classList.remove("left");
      });
      backBtn.addEventListener("mouseleave", function () {
        if (controlBtnOverlay) controlBtnOverlay.classList.remove("left");
      });
    } else {
      console.warn("Back button not found.");
    }

    // --- Forward (Next Song) Button ---
    if (forwardBtn) {
      forwardBtn.addEventListener("click", () => {
        currentSongIndex++;
        if (currentSongIndex >= songData.length) {
          currentSongIndex = 0; // Loop to first song
        }
        loadSong(currentSongIndex);
      });

      // Visual feedback for button press
      forwardBtn.addEventListener("mousedown", function () {
        if (controlBtnOverlay) controlBtnOverlay.classList.add("right");
      });
      forwardBtn.addEventListener("mouseup", function () {
        if (controlBtnOverlay) controlBtnOverlay.classList.remove("right");
      });
      forwardBtn.addEventListener("mouseleave", function () {
        if (controlBtnOverlay) controlBtnOverlay.classList.remove("right");
      });
    } else {
      console.warn("Forward button not found.");
    }

    // --- Volume Controls ---
    if (audioPlayer) {
      audioPlayer.volume = 0.3; // Set initial volume to 30%

      // Volume Up Button
      if (volUpBtn) {
        volUpBtn.addEventListener("click", () => {
          // Increase volume, ensuring it doesn't exceed 1
          const newVolume = Math.min(
            1,
            parseFloat((audioPlayer.volume + 0.1).toFixed(1)),
          );
          audioPlayer.volume = newVolume;
        });
        // Visual feedback
        volUpBtn.addEventListener("mousedown", function () {
          if (controlBtnOverlay) controlBtnOverlay.classList.add("up");
        });
        volUpBtn.addEventListener("mouseup", function () {
          if (controlBtnOverlay) controlBtnOverlay.classList.remove("up");
        });
        volUpBtn.addEventListener("mouseleave", function () {
          if (controlBtnOverlay) controlBtnOverlay.classList.remove("up");
        });
      } else {
        console.warn("Volume Up button not found.");
      }

      // Volume Down Button
      if (volDownBtn) {
        volDownBtn.addEventListener("click", () => {
          // Decrease volume, ensuring it doesn't go below 0.1 (or 0 if preferred)
          const newVolume = Math.max(
            0.1,
            parseFloat((audioPlayer.volume - 0.1).toFixed(1)),
          );
          audioPlayer.volume = newVolume;
        });
        // Visual feedback
        volDownBtn.addEventListener("mousedown", function () {
          if (controlBtnOverlay) controlBtnOverlay.classList.add("down");
        });
        volDownBtn.addEventListener("mouseup", function () {
          if (controlBtnOverlay) controlBtnOverlay.classList.remove("down");
        });
        volDownBtn.addEventListener("mouseleave", function () {
          if (controlBtnOverlay) controlBtnOverlay.classList.remove("down");
        });
      } else {
        console.warn("Volume Down button not found.");
      }
    } else {
      console.error(
        "Audio player element with ID 'audio-player' not found. Volume controls not initialized.",
      );
    }

    // ===== Initial Load =====
    // Load the initial song metadata and prepare for playback
    // Defer initial song load slightly to ensure DOM is fully ready after iframe becomes visible
    requestAnimationFrame(() => {
      loadSong(currentSongIndex);
    });
  },
};

// Automatically initialize the Music Player when the script is loaded and DOM is ready.
// This assumes the script is deferred or placed at the end of the body.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", window.MusicPlayer.init);
} else {
  window.MusicPlayer.init(); // DOMContentLoaded has already fired
}
