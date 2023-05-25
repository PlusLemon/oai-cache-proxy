# Prompt Logging

This proxy supports logging incoming prompts and model responses to different destinations.  Currently, Airtable and Google Sheets (not recommended) are supported.  You can enable prompt logging by setting the `PROMPT_LOGGING` environment variable to `true` and configuring the `PROMPT_LOGGING_BACKEND` environment variable to the desired logging backend.

The included backends are generally designed with the goal of working within the limitations of a service's free tier, such as strict API rate limits or maximum record limits.  As a result, they may be a little clunky to use and may not be as performant as a dedicated logging solution, but they should be sufficient for low-volume use cases. You can implement your own backend by exporting a module that implements the `PromptLoggingBackend` interface and wiring it up to `src/prompt-logging/log-queue.ts`.

Refer to the list below for the required configuration for each backend.

## Airtable


## Google Sheets

Refer to the dedicated [Google Sheets docs](logging-sheets.md) for detailed instructions on how to set up Google Sheets logging.

**⚠️ This implementation is strongly discouraged** due to the nature of content users may submit, which may be in violation of Google's policies.  They seem to analyze the content of API requests and may suspend your account.  Don't use this unless you know what you're doing.

