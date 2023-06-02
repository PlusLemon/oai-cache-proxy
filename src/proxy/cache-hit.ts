import { Request, Response, NextFunction } from "express";
import { cacheGet, getPromptForRequest, flattenMessages, checkSkipCache, cacheResp  } from "../cache";
import { logger } from "../logger";

export const cacheHiter = (req: Request, res: Response, next: NextFunction) => {

    const promptPayload = getPromptForRequest(req);
    const promptFlattened = flattenMessages(promptPayload);
    const [cache_result, contains] = checkSkipCache(promptFlattened);
    
    if (contains) {
        next();
        return;
    }

    cacheGet(cache_result)
        .then(result => {
            if (result == "") {
                next();
            } else {
                logger.info({result: result}, "cache hinter hint!!!!");
                if (res.headersSent) {
                    const fakeCacheEvent = buildFakeSseMessage(
                      result,
                      req
                    );
                    res.write(fakeCacheEvent);
                    res.end();
                  } else {
                    res.status(200).json(cacheResp(req, result))
                  }
            }
        })
        .catch(error => {
            logger.error("cache hinter ", error);
            next();
        });
  
  };

function buildFakeSseMessage(
    string: string,
    req: Request
    ) {
    let fakeEvent;

    if (req.inboundApi === "anthropic") {
        fakeEvent = {
        completion: `\`\`\`\n[${string}]\n\`\`\`\n`,
        stop_reason: "hint_cache",
        truncated: false, // I've never seen this be true
        stop: null,
        model: req.body?.model,
        log_id: "proxy-req-" + req.id,
        };
    } else {
        fakeEvent = {
        id: "chatcmpl-" + req.id,
        object: "chat.completion.chunk",
        created: Date.now(),
        model: req.body?.model,
        choices: [
            {
                delta: { content: `\`\`\`\n[${string}]\n\`\`\`\n` },
                index: 0,
                finish_reason: "hint_cache",
            },
        ],
        };
    }
    return `data: ${JSON.stringify(fakeEvent)}\n\n`;
}