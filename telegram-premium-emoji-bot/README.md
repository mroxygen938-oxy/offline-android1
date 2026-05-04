# Telegram Premium Emoji Bot

A tiny Python Telegram bot that checks whether *it* can re-send the premium
(custom) emojis you send to it.

## What it does

1. You send a message to the bot that contains one or more Telegram premium
   / custom emojis.
2. For each premium emoji in your message the bot:
   - Looks the emoji up via `getCustomEmojiStickers`.
   - Tries to send the same emoji back using a `<tg-emoji emoji-id="...">`
     HTML tag.
3. The bot replies once per emoji:
   - `Success: the bot supports this premium emoji.` together with the
     `emoji_id` (and `set_name` / fallback character when available) if the
     send worked.
   - `Failure: the bot cannot send this premium emoji.` together with the
     `emoji_id` and the underlying Telegram error otherwise.

If your message has no premium emojis the bot sends a short hint instead.

## Why a bot may fail to send a premium emoji

Bots can only send custom emojis that they have access to. In practice this
usually means:

- the emoji belongs to a custom emoji sticker set the bot owns, **or**
- the bot account has Telegram Premium enabled (configured by the bot owner
  via [@BotFather](https://t.me/BotFather)).

If neither is true, Telegram rejects the `<tg-emoji>` send and this bot
reports `Failure` for that emoji. That's the answer to "does this bot
support this premium emoji?".

## Setup

Requires Python 3.10+.

```bash
cd telegram-premium-emoji-bot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Get a bot token from [@BotFather](https://t.me/BotFather) and export it:

```bash
export BOT_TOKEN='123456:ABC-your-bot-token'
python bot.py
```

You can also copy `.env.example` to `.env`, fill it in, and source it:

```bash
cp .env.example .env
# edit .env
set -a && source .env && set +a
python bot.py
```

The bot uses long polling, so no public URL / webhook is needed.

## Running on Termux / Android

```bash
pkg install python
pip install -r requirements.txt
export BOT_TOKEN='123456:ABC-your-bot-token'
python bot.py
```

## How to test

1. Open a Telegram chat with your bot.
2. Send `/start` — you should see a help message.
3. Send a normal message — the bot should reply that there are no premium
   emojis in it.
4. Send a message containing a Telegram premium emoji (typed by a Premium
   user, or forwarded from a chat that has one). The bot should:
   - echo the emoji, then
   - reply with `Success: ... emoji_id: <id>` (or `Failure: ...` if the
     bot account itself cannot send custom emojis).

## Files

- `bot.py` — the bot.
- `requirements.txt` — pinned to `python-telegram-bot >= 21`.
- `.env.example` — template for the `BOT_TOKEN` env var.
