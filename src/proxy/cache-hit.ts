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
                logger.info({result: result, messages: req.body.messages}, "cache hinter hint!!!!");
                if (req.body.stream === true || req.body.stream === "true") {
                    res.statusCode = 200;
                    res.setHeader("Content-Type", "text/event-stream");
                    res.setHeader("Cache-Control", "no-cache");
                    res.setHeader("Connection", "keep-alive");
                    res.setHeader("X-Accel-Buffering", "no"); // nginx-specific fix
                    res.flushHeaders();
                    const fakeCacheEvent = buildFakeSseMessage(
                        {
                            delta: { content: result },
                            index: 0,
                        },
                        req
                    );
                    res.write(fakeCacheEvent);
                    res.write(buildFakeSseMessage(
                        {
                            delta: {},
                            index: 0,
                            finish_reason: "stop",
                        },
                        req
                    ));
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
    choice: object,
    req: Request
    ) {
    let fakeEvent;


    fakeEvent = {
        id: "chatcmpl-" + req.id,
        object: "chat.completion.chunk",
        created: Date.now(),
        model: req.body?.model,
        choices: [
            choice
        ],
    };

    return `data: ${JSON.stringify(fakeEvent)}\n\n`;
}