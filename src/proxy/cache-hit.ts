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
            logger.error("cache hinter hint!!!!");
            res.status(200).json(cacheResp(result))
        })
        .catch(error => {
            logger.error("cache hinter ", error);
            next();
        });
  
  };