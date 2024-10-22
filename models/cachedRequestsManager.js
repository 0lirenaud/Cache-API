import fs from "fs";
import * as utilities from "../utilities.js";
import * as serverVariables from "../serverVariables.js";
import Repository from "./repository.js";

let cacheExpirationTime = serverVariables.get("main.repository.CacheExpirationTime");

global.urlCaches = []
global.cachedCleanerStarted = false;

export default class CachedRequestsManager {
    //Uniquement les requêtes qui sont isCacheable que l'on met l'url dans la cache
    //Url de la requête au complet
    static startCachedRequestsCleaner() {
        setInterval(CachedRequestsManager.flushExpired, cacheExpirationTime * 1000);
        console.log(BgWhite + FgBlue, "[Periodic url data caches cleaning process started...]");
    }
    static add(url, content, ETag = "") {
        if(!cachedCleanerStarted) {
            cachedCleanerStarted = true;
            CachedRequestsManager.startCachedRequestsCleaner();
        }
        if(url != "") {
            CachedRequestsManager.clear(url);
            urlCaches.push({
                url,
                content,
                ETag,
                Expire_Time: utilities.nowInSeconds() + cacheExpirationTime
            });
            console.log(BgWhite + FgBlue, `[Content of ${url} request has been cached]`);
        }
    }
    static find(url) {
        try {
            if (url != "") {
                for (let cache of urlCaches) {
                    if (cache.url == url) {
                        // renew cache
                        cache.Expire_Time = utilities.nowInSeconds() + cacheExpirationTime;
                        console.log(BgWhite + FgBlue, `[${cache.url} retrieved from cache]`);
                        return cache;
                    }
                }
            }
        } catch (error) {
            console.log(BgWhite + FgRed, "[Request cache error!]", error);
        }
        return null;
    }
    static clear(url) {
        if (url != "") {
            let indexToDelete = [];
            let index = 0;
            for(let cache of urlCaches) {
                if(cache.url == url) 
                    indexToDelete.push(index);
                index++;
            }
            utilities.deleteByIndex(urlCaches, indexToDelete);
        }
    }
    static flushExpired(){
        let now = utilities.nowInSeconds();
        for (let cache of urlCaches) {
            if(cache.Expire_Time <= now) {
                console.log(BgWhite + FgBlue, "Cached file content of request " + cache.url + " expired");
            }
        }
        urlCaches = urlCaches.filter(cache => cache.Expire_Time > now);
    }
    static get(HttpContext) {
        if(!HttpContext.isCacheable)
            return false;

        let cache = CachedRequestsManager.find(HttpContext.req.url);
        if(cache) {
            HttpContext.response.JSON(
                cache.content,
                cache.ETag,
                true
            );
            return true;
        }
        
        return false;
    }
}