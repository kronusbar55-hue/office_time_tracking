# Announcement Sound Notifications

## How to Add a Custom Notification Sound

1. Download a free notification sound file (MP3 or WAV format) from:
   - [Freesound.org](https://freesound.org) - Search for "notification" or "bell"
   - [Zapsplat.com](https://www.zapsplat.com) - Free notification sounds
   - [Mixkit.co](https://mixkit.co/free-sound-effects/notification/)
   - [FreeSoundEffects.com](https://www.freesoundeffects.com/free-sounds/notification-10041/)

2. Save the file as `notification.mp3` in the `public/` folder

3. The app will automatically use your custom sound instead of the fallback beep

## Current Implementation

- **Automatic sound**: Plays when new announcements arrive (after user interaction)
- **Manual sound**: Plays when you create a new announcement
- **Fallback**: Uses Web Audio API beep if no sound file is found
- **Browser restrictions**: Sounds only play after user interaction (click, keypress, touch)

## Technical Details

- Volume: 30% (configurable in code)
- Duration: 300ms beep for fallback
- Frequency: 800Hz sine wave for fallback beep