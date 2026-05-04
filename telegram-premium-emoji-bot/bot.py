"""Telegram bot that echoes premium (custom) emojis.

When a user sends a message containing one or more Telegram premium / custom
emojis, the bot tries to send each one back. For every emoji it reports
whether it was able to send it (Success + emoji_id) or not (Failure).
"""

from __future__ import annotations

import logging
import os
import sys
from html import escape

from telegram import Message, MessageEntity, Update
from telegram.error import TelegramError
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logger = logging.getLogger("premium-emoji-bot")

WELCOME_TEXT = (
    "Hi! Send me any message that contains a Telegram premium / custom "
    "emoji and I'll try to send the same emoji back.\n\n"
    "For each premium emoji you send I'll reply with either:\n"
    "  - Success: the bot supports the emoji (with its emoji_id), or\n"
    "  - Failure: the bot can't send this emoji.\n\n"
    "Tip: premium emojis can only be typed by Telegram Premium users, "
    "but anyone can forward a message that contains them."
)

NO_CUSTOM_EMOJI_TEXT = (
    "I didn't see any premium / custom emoji in that message. "
    "Send a Telegram premium emoji and I'll try to echo it back."
)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start and /help."""
    message = update.effective_message
    if message is not None:
        await message.reply_text(WELCOME_TEXT)


def collect_custom_emojis(message: Message) -> list[tuple[str, str]]:
    """Return [(custom_emoji_id, fallback_text), ...] from a message.

    Looks at both ``entities`` (text messages) and ``caption_entities``
    (media with captions).
    """
    pairs: list[tuple[str, str]] = []
    if message is None:
        return pairs

    sources: list[tuple[tuple[MessageEntity, ...], str]] = [
        (message.entities or (), "entity"),
        (message.caption_entities or (), "caption"),
    ]
    for entities, kind in sources:
        for entity in entities:
            if entity.type != MessageEntity.CUSTOM_EMOJI:
                continue
            emoji_id = entity.custom_emoji_id
            if not emoji_id:
                continue
            try:
                if kind == "caption":
                    fallback = message.parse_caption_entity(entity)
                else:
                    fallback = message.parse_entity(entity)
            except (ValueError, RuntimeError):
                fallback = ""
            pairs.append((emoji_id, fallback))
    return pairs


def _build_tg_emoji_html(emoji_id: str, fallback: str) -> str:
    """Build the ``<tg-emoji>`` HTML used to send a custom emoji."""
    text = escape(fallback) if fallback else "&#10067;"
    return f'<tg-emoji emoji-id="{escape(emoji_id)}">{text}</tg-emoji>'


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Inspect the message for premium emojis and reply for each one."""
    message = update.effective_message
    if message is None:
        return

    custom_emojis = collect_custom_emojis(message)
    if not custom_emojis:
        await message.reply_text(NO_CUSTOM_EMOJI_TEXT)
        return

    for emoji_id, fallback in custom_emojis:
        sticker = None
        try:
            stickers = await context.bot.get_custom_emoji_stickers([emoji_id])
            sticker = stickers[0] if stickers else None
        except TelegramError as exc:
            logger.warning(
                "get_custom_emoji_stickers failed for %s: %s", emoji_id, exc
            )

        send_error: str | None = None
        try:
            await message.reply_html(_build_tg_emoji_html(emoji_id, fallback))
            send_ok = True
        except TelegramError as exc:
            send_ok = False
            send_error = str(exc)
            logger.info("Cannot send custom emoji %s: %s", emoji_id, exc)

        if send_ok:
            reply_lines = [
                "Success: the bot supports this premium emoji.",
                f"emoji_id: <code>{escape(emoji_id)}</code>",
            ]
            if sticker is not None:
                if sticker.emoji:
                    reply_lines.append(f"fallback: {escape(sticker.emoji)}")
                if sticker.set_name:
                    reply_lines.append(
                        f"set_name: <code>{escape(sticker.set_name)}</code>"
                    )
        else:
            reply_lines = [
                "Failure: the bot cannot send this premium emoji.",
                f"emoji_id: <code>{escape(emoji_id)}</code>",
            ]
            if send_error:
                reply_lines.append(f"error: <code>{escape(send_error)}</code>")

        await message.reply_html("\n".join(reply_lines))


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
    )

    token = os.environ.get("BOT_TOKEN", "").strip()
    if not token:
        sys.stderr.write(
            "BOT_TOKEN env var is required.\n"
            "Get a token from @BotFather, then run:\n"
            "  export BOT_TOKEN='123456:ABC...'\n"
            "  python bot.py\n"
        )
        sys.exit(1)

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", start))
    app.add_handler(MessageHandler(filters.ALL & ~filters.COMMAND, handle_message))

    logger.info("Bot started. Listening for messages...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
