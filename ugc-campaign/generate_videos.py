"""
Fentsi.com — 30 UGC Video Batch Generator
Uses: kie.ai Kling Avatar API + edge-tts (free Microsoft TTS)

Setup:
    pip install edge-tts requests aiofiles

Usage:
    python generate_videos.py

    Set KIE_API_KEY below before running.
    Place avatar photos in ./avatars/ folder.
    Videos download to ./output/ folder.
"""

import asyncio
import os
import time
import json
import base64
import requests
from pathlib import Path
import edge_tts  # pip install edge-tts

# ─── CONFIG ───────────────────────────────────────────────────────────────────

KIE_API_KEY = "YOUR_KIE_AI_API_KEY_HERE"   # <-- set your key here
BASE_URL    = "https://api.kie.ai"
MODEL       = "kling-v2-master"              # kling-v1-5-standard for cheaper option

AVATAR_DIR  = Path("avatars")               # put your .jpg/.png headshots here
AUDIO_DIR   = Path("audio")
OUTPUT_DIR  = Path("output")

AVATAR_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Map to rotate through available avatar photos
FEMALE_AVATARS = sorted(AVATAR_DIR.glob("female_*.jpg")) + sorted(AVATAR_DIR.glob("female_*.png"))
MALE_AVATARS   = sorted(AVATAR_DIR.glob("male_*.jpg"))   + sorted(AVATAR_DIR.glob("male_*.png"))

# ─── ALL 30 SCRIPTS ───────────────────────────────────────────────────────────

SCRIPTS = [
    # (id, title, avatar_gender, duration_s, voice, full_script)
    (1,  "60-Second Wedding Plan",      "F", 30, "en-US-AriaNeural",
     "I planned my entire wedding in 60 seconds. No, seriously. "
     "I was drowning in vendor tabs, Pinterest boards, and spreadsheets. "
     "Then I found Fentsi. I answered 10 quick questions — type of wedding, guest count, budget, vibe — "
     "and in under a minute I had a FULL event plan. Real vendors in my city. Optimised budget. "
     "Month-by-month timeline. Everything. Try it free at fentsi.com"),

    (2,  "Stop Googling Vendors",       "M", 20, "en-US-GuyNeural",
     "Stop googling best wedding caterers near me at 2am. "
     "Fentsi pulls real, verified vendors in your area — filtered by your budget and aesthetic. "
     "No random results. No cold calls. Just your plan, your vendors, your wedding. "
     "fentsi.com — your plan in 60 seconds."),

    (3,  "Budget Breakdown Reveal",     "F", 25, "en-US-AriaNeural",
     "This AI told me exactly how to split my 15,000 dollar wedding budget. "
     "I said catering and photos were my top priorities. "
     "Fentsi redistributed my entire budget around that — more for the photographer, less for florals. "
     "It felt like having a financial advisor who actually knew weddings. "
     "See your personalised breakdown at fentsi.com"),

    (4,  "Old Way vs Fentsi",           "F", 20, "en-US-JennyNeural",
     "Old way: 40 hours of research. Fentsi: 60 seconds. "
     "Old way: 12 browser tabs, 5 spreadsheets, 3 crying sessions. "
     "Fentsi way: answer 10 questions, get a full plan with real vendors, real timeline, real budget. "
     "I'm not joking. fentsi.com — try it for free."),

    (5,  "Venue Research Nightmare",    "M", 25, "en-US-GuyNeural",
     "Finding a wedding venue almost destroyed me. Until this. "
     "Every venue I found was either booked, over budget, or had zero reviews. "
     "Fentsi found me 6 real venues in my area matching my exact style and budget — "
     "all clickable with real contact info. Game changer. fentsi.com"),

    (6,  "The Coordination Package",    "F", 30, "en-US-AriaNeural",
     "What if someone just handled your wedding vendors for you? "
     "Fentsi doesn't just give you a plan. "
     "Once you pick your vendors, their team negotiates the deals for you. "
     "No awkward phone calls. No back-and-forth emails. They handle it. "
     "You just show up and get married. "
     "Check out the coordination package at fentsi.com"),

    (7,  "POV Just Got Engaged",        "F", 20, "en-US-JennyNeural",
     "POV: you just got engaged and have NO idea where to start. "
     "That was me 3 months ago. I opened Fentsi, answered 10 questions, "
     "and had a complete wedding plan — timeline, vendors, budget — in under a minute. "
     "I cried happy tears. Start at fentsi.com"),

    (8,  "AI That Knows Your City",     "M", 20, "en-US-GuyNeural",
     "Your AI event planner should know your city. Fentsi does. "
     "Every vendor Fentsi recommends is a real business in your area — "
     "searched, filtered, and matched to your exact budget and style. "
     "Not a template. Not a generic list. Your event. Your city. fentsi.com"),

    (9,  "Party in 60 Seconds",         "F", 25, "en-US-AriaNeural",
     "I had 3 weeks to plan a surprise 30th birthday. I used AI. "
     "100 guests, outdoor venue, 3,000 dollar budget, rustic vibe. "
     "I answered 10 questions on Fentsi and got a full plan — "
     "catering, decorators, entertainment — all real businesses near me. "
     "Done in one minute. fentsi.com"),

    (10, "Birthday Budget Hack",        "M", 20, "en-US-GuyNeural",
     "Best birthday party planning hack I have ever found. "
     "Instead of spending hours comparing vendors, "
     "I told Fentsi my budget and what mattered most — food and music. "
     "It built the entire plan around those priorities. The rest? Handled. "
     "Try it at fentsi.com"),

    (11, "500 Dollar Stunning Party",   "F", 25, "en-US-JennyNeural",
     "I threw a stunning party on a 500 dollar budget. Here's how. "
     "Fentsi took my 500 dollars, my 30-person guest list, and my garden party vibe — "
     "and gave me a full plan with actual vendors in my area that fit every dollar. "
     "I was honestly shocked. fentsi.com"),

    (12, "No More Group Chat Chaos",    "F", 20, "en-US-AriaNeural",
     "Stop planning parties in a group chat. Seriously. "
     "The chaos, the conflicting opinions, the 'I thought YOU booked the caterer' moments. "
     "Fentsi gives you ONE complete plan. You present it. Everyone's happy. fentsi.com"),

    (13, "Kids Birthday Party",         "F", 20, "en-US-JennyNeural",
     "Planning a kids birthday party shouldn't be this hard. "
     "I told Fentsi: 20 kids, outdoor, 800 dollars, superhero theme. "
     "It gave me the perfect vendor list — bouncy castle hire, themed catering, entertainment — "
     "all in my city. My kid thought I was a genius. fentsi.com"),

    (14, "NYE Party Planning",          "M", 25, "en-US-GuyNeural",
     "Stop stressing about New Year's Eve. AI's got it. "
     "NYE is the hardest event to plan — everything gets booked fast. "
     "Fentsi gave me a full plan with a timeline telling me exactly when to book each vendor. "
     "No last-minute panic. fentsi.com"),

    (15, "Dad's 50th Birthday",         "F", 25, "en-US-AriaNeural",
     "My dad's 50th birthday was the best party he's ever had. I used this. "
     "I wanted it to be special but had no idea where to start. "
     "Fentsi asked me 10 questions — size, budget, his style — "
     "and gave me a complete plan with real local vendors. "
     "He had no idea how little effort it took me. fentsi.com"),

    (16, "Boss Gave Me 2 Weeks",        "M", 30, "en-US-GuyNeural",
     "My boss gave me 2 weeks to plan the company retreat. I panicked. Then I found this. "
     "50 people, 20,000 dollar budget, 3 days outside the city. "
     "I put it all into Fentsi and got a full event plan — "
     "venues, catering, activities, accommodation — with a month-by-month timeline. "
     "I looked like a total pro. fentsi.com"),

    (17, "Office Christmas Party",      "F", 20, "en-US-JennyNeural",
     "The AI that plans your office Christmas party better than any committee. "
     "No more committee meetings. No more lukewarm compromises. "
     "Fentsi takes your headcount, budget, and vibe — and delivers a plan. "
     "Real venues, real caterers, real options. You just approve. fentsi.com"),

    (18, "Product Launch Event",        "M", 25, "en-US-GuyNeural",
     "You're launching a product. You need an event. You need this. "
     "Fentsi handles the logistics so you can focus on what matters — your product. "
     "Venue, catering, AV, styling — all planned around your brand aesthetic and budget. "
     "In 60 seconds. fentsi.com"),

    (19, "Team Building Event",         "F", 20, "en-US-AriaNeural",
     "Team building events don't have to be awkward or expensive. "
     "Tell Fentsi your team size, budget, and the kind of vibe you want — "
     "fun, active, relaxed — and it builds the whole thing. "
     "Real activity providers, real venues, real prices. Done. fentsi.com"),

    (20, "Conference Planning",         "M", 30, "en-US-GuyNeural",
     "Planning a corporate conference shouldn't cost you your sanity. "
     "I've planned 3 conferences the old way — spreadsheets, cold emails, weeks of vendor negotiations. "
     "Fentsi did in 60 seconds what used to take me 3 weeks. "
     "Real vendors, optimised budget, full timeline. I'm never going back. fentsi.com"),

    (21, "Perfect Baby Shower",         "F", 20, "en-US-JennyNeural",
     "Planning the perfect baby shower just got a lot easier. "
     "I had 6 weeks and zero ideas. "
     "Fentsi asked me 10 questions and gave me everything — "
     "venue suggestions, catering, decoration vendors, timeline. "
     "All real businesses near me, all within budget. fentsi.com"),

    (22, "Graduation Party",            "M", 20, "en-US-GuyNeural",
     "Your graduation party should be as epic as your degree. "
     "Fentsi built my entire graduation celebration plan in under a minute. "
     "Real venues, real catering options — "
     "everything matched to what I actually said mattered and my exact budget. fentsi.com"),

    (23, "Bachelorette Weekend",        "F", 25, "en-US-AriaNeural",
     "Being the Maid of Honor is stressful. Planning the bachelorette doesn't have to be. "
     "Tell Fentsi the city, the bride's vibe, the budget, the headcount — "
     "and get a full bachelorette weekend plan. "
     "Activities, restaurants, accommodation ideas — all real and clickable. fentsi.com"),

    (24, "Anniversary Dinner",          "M", 20, "en-US-GuyNeural",
     "Planning your anniversary should be romantic, not a research project. "
     "I wanted a special anniversary dinner but had no idea which venue to pick. "
     "Fentsi matched me with perfect options in my city, within my budget, "
     "with the exact romantic aesthetic I described. fentsi.com"),

    (25, "Family Reunion",              "F", 25, "en-US-JennyNeural",
     "Organising a family reunion? There's an AI for that. "
     "50 family members, different cities, everyone has opinions. "
     "I used Fentsi to lock in a solid plan — venue, catering, activities — and shared it. "
     "Everyone was impressed. Nobody knew it took me 60 seconds. fentsi.com"),

    (26, "The 10 Questions",            "F", 30, "en-US-AriaNeural",
     "10 questions. 60 seconds. Complete event plan. Watch this. "
     "Fentsi asks you: event type, date, number of guests, budget, location, "
     "aesthetic style, priorities, and what services you want. "
     "Then boom — full plan. Real vendors. Optimised budget. Month-by-month timeline. "
     "All built for YOUR event. Try it at fentsi.com"),

    (27, "Real Vendors Explained",      "M", 25, "en-US-GuyNeural",
     "The difference between Fentsi and every other event planner app. "
     "Other tools give you templates. Generic advice. Fake examples. "
     "Fentsi gives you real vendors in your actual area — "
     "found via live search, filtered by your budget and style. "
     "Clickable. Bookable. Real. fentsi.com"),

    (28, "Budget AI",                   "F", 25, "en-US-JennyNeural",
     "This AI redistributes your event budget based on what YOU care about. "
     "You tell Fentsi your priorities — "
     "maybe you care most about food and music, less about florals. "
     "The budget breakdown reflects exactly that. "
     "It's like having a financial advisor who specialises in events. fentsi.com"),

    (29, "Month-by-Month Timeline",     "M", 20, "en-US-GuyNeural",
     "The most stressful part of event planning? Knowing what to do when. "
     "Fentsi gives you a month-by-month timeline all the way to your event day. "
     "You'll never miss a booking deadline or wonder: should I have booked this already? "
     "fentsi.com"),

    (30, "The Full Experience",         "F", 30, "en-US-AriaNeural",
     "Let me show you exactly how Fentsi works. "
     "Answer 10 questions about your event. "
     "In under 60 seconds you get: a full plan written specifically for your event, "
     "real vendors in your city filtered by style and budget, "
     "a budget breakdown based on your priorities, "
     "and a timeline to your event day. "
     "Then pick your vendors and request quotes — "
     "or let Fentsi's team handle everything for you. "
     "Start free at fentsi.com"),
]


# ─── STEP 1: GENERATE TTS AUDIO ───────────────────────────────────────────────

async def generate_audio(video_id: int, script_text: str, voice: str) -> Path:
    audio_path = AUDIO_DIR / f"video_{video_id:02d}.mp3"
    if audio_path.exists():
        print(f"  [TTS] Audio {video_id:02d} already exists, skipping.")
        return audio_path

    communicate = edge_tts.Communicate(script_text, voice=voice, rate="+5%")
    await communicate.save(str(audio_path))
    print(f"  [TTS] Generated audio for video {video_id:02d} ({voice})")
    return audio_path


async def generate_all_audio():
    print("\n=== STEP 1: Generating TTS Audio (free via edge-tts) ===")
    tasks = [generate_audio(vid_id, script, voice)
             for vid_id, _, _, _, voice, script in SCRIPTS]
    return await asyncio.gather(*tasks)


# ─── STEP 2: SUBMIT AVATAR VIDEO TASKS ────────────────────────────────────────

def get_avatar_path(gender: str, index: int) -> Path:
    avatars = FEMALE_AVATARS if gender == "F" else MALE_AVATARS
    if not avatars:
        raise FileNotFoundError(
            f"No {'female' if gender=='F' else 'male'} avatar images found in {AVATAR_DIR}. "
            "Add JPG/PNG headshots named female_1.jpg, male_1.jpg etc."
        )
    return avatars[index % len(avatars)]


def file_to_base64(path: Path) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def submit_avatar_task(video_id: int, gender: str, audio_path: Path, duration: int) -> str:
    avatar_path = get_avatar_path(gender, video_id)
    avatar_b64  = file_to_base64(avatar_path)
    audio_b64   = file_to_base64(audio_path)

    # Determine image mime type
    img_mime = "image/jpeg" if avatar_path.suffix.lower() in (".jpg", ".jpeg") else "image/png"

    payload = {
        "model_name": MODEL,
        "image":      f"data:{img_mime};base64,{avatar_b64}",
        "audio":      f"data:audio/mpeg;base64,{audio_b64}",
        "duration":   duration,
        "mode":       "std",
    }
    headers = {
        "Authorization": f"Bearer {KIE_API_KEY}",
        "Content-Type":  "application/json",
    }
    resp = requests.post(
        f"{BASE_URL}/api/v1/kling/v1/videos/ai-avatar",
        json=payload,
        headers=headers,
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    task_id = data.get("data", {}).get("task_id") or data.get("task_id")
    print(f"  [API] Submitted video {video_id:02d} → task_id: {task_id}")
    return task_id


# ─── STEP 3: POLL FOR COMPLETION ──────────────────────────────────────────────

def poll_task(task_id: str, video_id: int, poll_interval: int = 30) -> str:
    headers = {"Authorization": f"Bearer {KIE_API_KEY}"}
    url = f"{BASE_URL}/api/v1/kling/v1/videos/ai-avatar/{task_id}"

    for attempt in range(40):  # max ~20 minutes
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data   = resp.json().get("data", {})
        status = data.get("task_status", "")

        if status == "succeed":
            video_url = (data.get("task_result", {})
                             .get("videos", [{}])[0]
                             .get("url", ""))
            print(f"  [DONE] Video {video_id:02d} ready: {video_url}")
            return video_url
        elif status == "failed":
            raise RuntimeError(f"Video {video_id:02d} task failed: {data}")
        else:
            print(f"  [WAIT] Video {video_id:02d} status={status} (attempt {attempt+1})")
            time.sleep(poll_interval)

    raise TimeoutError(f"Video {video_id:02d} did not complete within polling window")


# ─── STEP 4: DOWNLOAD VIDEO ───────────────────────────────────────────────────

def download_video(video_url: str, video_id: int, title: str):
    safe_title = "".join(c if c.isalnum() or c in " _-" else "" for c in title).strip().replace(" ", "_")
    out_path = OUTPUT_DIR / f"video_{video_id:02d}_{safe_title}.mp4"
    resp = requests.get(video_url, stream=True, timeout=120)
    resp.raise_for_status()
    with open(out_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    print(f"  [SAVED] {out_path}")
    return out_path


# ─── MAIN ORCHESTRATOR ────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("FENTSI.COM — 30 UGC VIDEO GENERATOR")
    print("=" * 60)

    if KIE_API_KEY == "YOUR_KIE_AI_API_KEY_HERE":
        print("\nERROR: Set your KIE_API_KEY in this script before running.")
        return

    # Step 1: Generate all TTS audio (async)
    audio_paths = asyncio.run(generate_all_audio())

    # Load state file to resume from interruptions
    state_file = Path("generation_state.json")
    state = json.loads(state_file.read_text()) if state_file.exists() else {}

    print("\n=== STEP 2: Submitting Avatar Video Tasks ===")
    for (vid_id, title, gender, duration, voice, _), audio_path in zip(SCRIPTS, audio_paths):
        key = str(vid_id)
        if key in state and "task_id" in state[key]:
            print(f"  [SKIP] Video {vid_id:02d} already submitted (task_id={state[key]['task_id']})")
            continue
        try:
            task_id = submit_avatar_task(vid_id, gender, audio_path, duration)
            state[key] = {"task_id": task_id, "title": title, "gender": gender}
            state_file.write_text(json.dumps(state, indent=2))
            time.sleep(2)  # be polite to the API
        except Exception as e:
            print(f"  [ERROR] Video {vid_id:02d}: {e}")

    print("\n=== STEP 3: Polling & Downloading ===")
    for (vid_id, title, gender, duration, voice, _) in SCRIPTS:
        key = str(vid_id)
        if key not in state or "task_id" not in state[key]:
            continue
        if "downloaded" in state[key]:
            print(f"  [SKIP] Video {vid_id:02d} already downloaded")
            continue
        try:
            video_url = poll_task(state[key]["task_id"], vid_id)
            download_video(video_url, vid_id, title)
            state[key]["downloaded"] = True
            state_file.write_text(json.dumps(state, indent=2))
        except Exception as e:
            print(f"  [ERROR] Video {vid_id:02d}: {e}")

    total_done = sum(1 for v in state.values() if v.get("downloaded"))
    print(f"\n{'='*60}")
    print(f"COMPLETE: {total_done}/30 videos downloaded to ./{OUTPUT_DIR}/")
    print("=" * 60)


if __name__ == "__main__":
    main()
