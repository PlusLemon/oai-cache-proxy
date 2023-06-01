import { config } from "./config";
import axios from 'axios';
import { Request } from "express";

const CACHE_URL = config.cacheHost;

export async function cachePut(key: string, value: any): Promise<void> {
    if (!config.cacheAllowed) {
        return;
    }
    const [result, contains] = checkSkipCache(key);
    await axios.put(`${CACHE_URL}?prompt=${result}`, { value });
}

export async function cacheGet(key: string): Promise<string> {
    if (!config.cacheAllowed) {
        return "";
    }
    try {
        const response = await axios.get(`${CACHE_URL}?prompt=${key}`, { timeout: 3000 });
        if (response.data == "null") {
            return ""
        }
        return response.data;
    } catch (error) {
        console.error(`Failed to get cache data for key ${key}:`, error);
        return "";
    }
}

export function checkSkipCache(a: string): [string, boolean] {
    const contains = a.includes(config.cacheSkipWord);
    const result = contains ? a.replace(config.cacheSkipWord, '') : a;
    return [result, contains];
}

export function cacheResp(a: string): object {
    return {
        "id": "chatcmpl-cache",
        "object": "chat.completion",
        "created": Date.now(),
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": a,
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0
        }
    };
}

type OaiMessage = {
    role: "user" | "assistant" | "system";
    content: string;
};

export const getPromptForRequest = (req: Request): string | OaiMessage[] => {
    // Since the prompt logger only runs after the request has been proxied, we
    // can assume the body has already been transformed to the target API's
    // format.
    if (req.outboundApi === "anthropic") {
        return req.body.prompt;
    } else {
        return req.body.messages;
    }
};

export const flattenMessages = (messages: string | OaiMessage[]): string => {
    if (typeof messages === "string") {
        return messages;
    }
    return messages.map((m) => `${m.role}: ${m.content}`).join("\n");
};