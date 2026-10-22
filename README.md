# Screen Demo Framer — local prototype

Select one continuous 20–60 second range from an owned landscape MP4, choose up to six fixed manual crop or Fit shots, and export a portrait MP4. There is no tracking, model runtime, cloud upload or account system.

Requires existing Node 22, FFmpeg with libx264/AAC, and ffprobe. No npm dependencies. Use your existing trusted binary paths; this prototype does not install tools.

```bash
export FFMPEG=/absolute/path/to/ffmpeg
export FFPROBE=/absolute/path/to/ffprobe
node --test test.mjs
node server.mjs
```

Open `http://127.0.0.1:4177`. The demonstrated shell was Linux Bash; PowerShell was unavailable and was not tested. Stop with Ctrl+C. Working files remain in `.local/` in this product folder; nothing is uploaded by the application.

1. Open your own MP4: 1920×1080 or 2560×1440, CFR 25/30, H.264, square pixels, rotation zero, 20–300 seconds, at most 500 MiB, no audio or one AAC track.
2. Set From and To. **Set range resets shots to one Fit shot.** The range must be 20–60 seconds.
3. Move the time slider and Split at playhead. Each shot must be at least one second; up to six shots must cover the range continuously.
4. Select a shot, choose Crop, set its height and Apply frame. Click the source to place the rectangle, or enter exact pixel coordinates. Pointer positions can quantize on a small player; use numerical fields for exact placement. The rectangle uses even source pixels and an exact 9:16 aspect ratio (height multiples of 32).
5. Fit keeps the whole frame with padding. Crop enlarges the selected source area; neither can restore missing detail.
6. Save plan JSON. Reopen it only after importing the exact same source bytes. Changing the source makes the SHA mismatch fail.
7. Preview the full range and each cut. Export; wait for “Export ready”; open the actual MP4 separately and inspect it in full. Preview is not the exported file.

The output is 1080×1920, 30 fps, H.264/yuv420p, with AAC when the source contains audio. Hard cuts only. Source bytes are not rewritten. Cancelled or failed jobs do not expose partial downloads.

This is a single-user prototype, not a production or security certification. Maximum-size/disk-full testing and a complete accessibility audit are outstanding. Exact earlier visual-pilot checks are scoped evidence only; independent final video-plus-kit reproduction and final release reviews remain outstanding. Publication status as of 2026-10-22: the prior companion snapshot is publicly available at the fixed repository version linked below. Full episode acceptance and release remain separate controller gates. This documentation correction is a new review candidate until separately published.


## Repeat the shown result

This local candidate includes the owned fictional poster recording in `example/source.mp4` and its exact `example/shot-plan.json`. No account, API key, model download or package install is needed. Use your already available FFmpeg and ffprobe binaries with the Bash environment variables above. There is no `.env` loader.

After starting the server, open the example MP4. Set From **0** and To **20**, then click **Set range**. Select Crop, enter Left **656**, Top **0**, Height **1024**, and click **Apply frame**. Move the slider to **4.50 seconds** and click **Split at playhead**. Select shot **02**, enter Left **1260**, Top **32**, Height **1024**, and click **Apply frame**. Preview the click before 4.5 seconds and poster after 4.5 seconds. Save the plan, then export the portrait MP4 and play the downloaded file separately. As a shortcut, reopen the supplied plan after importing the exact supplied source. Reopening the plan is not a demonstration of building the product.

For a deterministic, non-browser check of this exact example, run `node verify-example.mjs` with the same FFMPEG and FFPROBE variables. It validates the source and plan and writes `example-check.mp4` only if that filename does not already exist. This is a producer-supplied reproduction helper, not an independent usability verdict.

## Recover after a source mismatch

If Reopen plan reports “Plan version or source SHA does not match”:

1. Reload the browser page. Keep your saved plan JSON; unsaved edits are not recovered by a reload.
2. Import the exact original MP4 used when you saved that plan, and wait for the source to load. A re-encoded copy or a file with changed bytes is not the same source, even if the picture looks identical.
3. Choose **Reopen plan** and select the saved JSON again. For the supplied example, use `example/source.mp4` and `example/shot-plan.json`; both shots should return with “Plan reopened with matching source SHA.”
4. Check the shots and preview the range before exporting again.

Repeatedly selecting the same plan filename without reloading may not trigger the file-input change event. Reloading first is the verified workaround; this documentation update does not fix that handler or provide automatic recovery. The earlier retry without a reload failed and remains a known limitation. Automated browser checking verified the reload/import/reopen sequence with the supplied example; it is not human usability validation or a validation/security guarantee.

## Recording and AI disclosure

The product was authored by a Codex worker; the terminal recording shows actual source application, commands and tests in Bash through an xterm.js browser PTY. It does not show the original model submission UI or continuous model generation, and is not native PowerShell. The poster demonstration was captured later with automated browser input and an instrumented pointer. Manual numeric framing is not AI tracking. Read PROMPTS.json for retained actual instruction excerpts and observed failures. The explanation will distinguish original source-application footage from later demonstrations.

This documentation-corrected package is a **review candidate**. The earlier companion snapshot was published on 2026-10-22; availability is not final episode acceptance. Fixed earlier public version: https://github.com/m34959203/agent-proof-lab-screen-demo-framer-public/tree/bae673db64508257a0419d486a3dbf9ee70300af. Model output is not guaranteed to repeat identically. No new paid service was used in this revision; historical subscription costs are not measured here.
