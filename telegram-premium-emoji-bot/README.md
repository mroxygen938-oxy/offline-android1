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
   - **Verifies** the message Telegram actually delivered still contains a
     `custom_emoji` entity with the same id. Telegram does not raise an
     error when a non-Premium bot tries to send a custom emoji it does not
     own — it silently strips the `<tg-emoji>` tag and only the static
     fallback character goes through. The bot detects this and treats it
     as a failure (and deletes the fallback echo so you don't see a
     misleading static emoji).
3. The bot replies once per emoji:
   - `Success: the bot supports this premium emoji.` together with the
     `emoji_id` (and `set_name` / fallback character when available) when
     the animated premium emoji really went through.
   - `Failure: the bot cannot send this premium emoji.` together with the
     `emoji_id` and a reason otherwise (either a Telegram error or
     `Telegram dropped the custom emoji entity ...`).

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
