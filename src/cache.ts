import { config } from "./config";
import axios from 'axios';
import { Request } from "express";

const CACHE_URL = config.cacheHost;

const CACHE_REQUEST_CONFIG = {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
    timeout: 3000,
};

export async function cachePut(key: string, value: any): Promise<void> {
    if (!config.cacheAllowed) {
        return;
    }
    const [result, contains] = checkSkipCache(key);
    await axios.post(`${CACHE_URL}/put`, { 
        "prompt": result,
        "answer": value,
     }, CACHE_REQUEST_CONFIG);
}

export async function cacheGet(key: string): Promise<string> {
    if (!config.cacheAllowed) {
        return "";
    }
    try {
        const response = await axios.post(`${CACHE_URL}/get`, { 
            "prompt": key,
         }, CACHE_REQUEST_CONFIG);
        if (response.data && response.data.answer) {
            return response.data.answer;
        }else {
            return "";
        }
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

export function cacheResp(req: Request, a: string): object {
    return {
        id: "chatcmpl-" + req.id,
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