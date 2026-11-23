# MRI Study Lab Go

An Even Hub plugin for the Even G2, built separately from the MRI Study Lab website. This is a private test candidate.

## What is included

- **Quick Study** cycles through 226 shared registry study items as of this build. The bundle uses single-best-answer questions with two to four choices that can be answered without an image. It covers physics and calculations, image production, artifacts, procedures, anatomy, safety, and patient care.
- **Flashcards** offers 30 brief cards. Reveal the answer, then rate it with **Knew it** or **Missed it**. Self-ratings stay separate from objective question attempts.
- **Weak Areas** uses the main app's mastery and spaced-review rules. The queue prioritizes severe weaknesses, repeated misses, due reviews, and recently missed material. Imported attempts about questions outside the glasses subset remain in backup data.
- **Physics Recall** serves 25 of the 30 cards and includes optional examples of normalized T1 recovery and T2 decay. The graphics use the device's supported monochrome image container. Full physics lessons remain in the main app.

## Controls

| Screen | Swipe up or down | Single tap | Double tap |
| --- | --- | --- | --- |
| Home | Move focus | Enter or resume the focused mode | Open the system exit confirmation |
| Prompt | Read earlier or later prompt pages where needed | Read more, show choices, or reveal a card | Return to Home |
| Choices | Cycle answers or the optional topic hint | Arm the focused answer or request the hint | Return to the prompt |
| Confirm | Cancel the armed answer | Submit the armed answer | Cancel and return to choices |
| Feedback or flashcard answer | Change the focused action | Read more, then run the focused action | Return to Home |
| Optional relaxation curve | Return to the flashcard | Return to the flashcard | Return to the flashcard |

The G2 temple controls and optional R1 use the same mapping. The arm-and-confirm step prevents a single stray tap from recording an answer. Wrong-answer feedback includes the correct answer and its principle, then an explanation of the chosen answer. **Try same concept** appears when another bundled item maps to the same topic or Academy lesson. Otherwise the app offers another item in the same subject. **Review on phone** prepares a link in the plugin phone view.

## Install a private test build

1. Get `mri-study-lab-go.ehpk` from the GitHub Actions artifact **mri-study-lab-go-private-test**, or build it with the commands below.
2. Sign in to the [Even Hub developer portal](https://hub.evenrealities.com/login) with the same account as the Even Realities phone app. Create the project if needed, then upload the EHPK under **Builds** as a private build.
3. Pair the G2 with the phone. Use Even Realities app **2.2.10 or later** and enable Developer Mode to show **Even Hub**. Open **Me → Apps → Private builds**, then **Install** and launch from the phone.
4. The private build uses your own developer account. To invite a separate tester or test launching from the glasses menu, use the official Beta workflow after hardware checks.

[Private testing instructions](https://hub.evenrealities.com/docs/test/private-testing) · [Packaging and deployment](https://hub.evenrealities.com/docs/ship/packaging)

## Build and run the simulator

Use Node.js 24 and npm. From the repository root:

```sh
cd companion/g2
npm ci
npm test
npm run pack
```

The official CLI builds `mri-study-lab-go.ehpk`. For simulator testing, run `npm run dev` in one terminal, then the following in a second terminal.

```sh
npm exec -- evenhub-simulator 'http://127.0.0.1:5173/?sim=1' --automation-port 9898
npm run test:simulator
```

Run the second command while the simulator is open from a fresh launch. The simulator test uses Python and Pillow and writes framebuffer images under `/tmp/mri-go-screens` by default. On a Linux runner, the official simulator needs a display server and its GTK/WebKit runtime. The standalone GitHub Actions workflow installs those dependencies and publishes the EHPK and simulator outputs for review.

For a quick hardware preview before installing a private build, put the phone and laptop on the same network, run the dev server, and use `npm exec -- evenhub qr --url http://YOUR-LAN-IP:5173`. Scan it in the Even Hub tab of the phone app. Use the packaged build for offline validation.

[Official simulator](https://hub.evenrealities.com/docs/test/simulator) · [Local testing](https://hub.evenrealities.com/docs/test/local-testing) · [Everything EvenHub tooling](https://github.com/even-realities/everything-evenhub)

## Move progress between devices

1. **Main app to Go** · On desktop or iPad, open MRI Study Lab **Settings → Export backup**. Move the JSON to the phone with Files, AirDrop or another transfer method you control. Open Go on the phone and choose **Import study backup**.
2. **Go to main app** · On the Go phone screen, choose **Export study backup**. Save or share the JSON to the iPad or desktop, then use **Settings → Import backup** in the main app.
3. If the Even phone WebView cannot share or download files, use **Transfer as text** and save the provided JSON as a `.json` file. A Go backup also retains flashcard self-ratings when imported back into Go.

The transfer uses version 3 of the main backup format, including version 1 continuous-study records. Attempts use stable item IDs, content versions, and immutable attempt IDs. Duplicate imports are idempotent. A conflicting attempt keeps the existing record. Bookmark changes take the newest timestamp, and reset dates take the maximum without deleting attempts. The Go export contains study attempts and bookmarks but omits personal notes, exam sessions and image files. Go flashcard ratings travel in a separate versioned field and are consumed only by Go.

The SDK provides string-based, app-scoped local storage. Go uses a separate WebView IndexedDB database so it can commit session state and new attempts together. The phone hosts the WebView and sends display changes to paired glasses. Packaged questions and cards use no remote APIs. Lesson links require connectivity unless the target app and lesson are available offline on the destination device. Phone lock, BLE reconnect, storage retention across upgrades and actual air-gapped use still need device validation. Keep a backup before removing the app or clearing its data.

There is no account or cloud service in this build. Automatic sync would need an opt-in authenticated endpoint with per-user authorization, encrypted transport, retention and deletion controls, and the same idempotent attempt and bookmark rules. Local JSON exchange avoids adding those dependencies and keeps data on devices the learner chooses.

## Hardware checklist

- Start each of the four modes and confirm the first and last lines fit on the G2. Try both temples and an R1 if available.
- Select an answer, cancel it with a double tap, then submit it. Try a hint, an incorrect answer, **Try same concept**, and **Review on phone**. Verify the phone link opens the right lesson.
- Reveal a flashcard and record each self-rating. Open one T1 or T2 curve and check the axes and labels.
- Turn off Wi-Fi and mobile data while leaving Bluetooth on. Study, relaunch, and verify saved progress.
- Answer a question, disconnect and reconnect the G2, then reopen the plugin. Lock the phone and repeat. For reviewer parity, run the official five-minute lock check after promotion to Beta.
- Export and import the same backup twice between Go and the main app. Confirm that attempts appear once, assisted status is retained, and existing notes and exam records are still accessible.

[Device APIs](https://hub.evenrealities.com/docs/build/device-apis) · [Display limits](https://hub.evenrealities.com/docs/build/display) · [Lifecycle behavior](https://hub.evenrealities.com/docs/build/background-lifecycle)
