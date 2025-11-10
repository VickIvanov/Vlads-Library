package com.cosmiclibrary.service;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class BackgroundService {
    
    public List<Map<String, String>> getAvailableBackgrounds() {
        boolean isVercel = System.getenv("VERCEL") != null || System.getenv("VERCEL_ENV") != null;
        
        String backgroundsEnv;
        if (isVercel) {
            backgroundsEnv = System.getenv("VERCEL_BACKGROUNDS");
            if (backgroundsEnv == null || backgroundsEnv.trim().isEmpty()) {
                backgroundsEnv = "space1.svg,space2.svg,space3.svg";
            }
        } else {
            backgroundsEnv = System.getenv("LOCAL_BACKGROUNDS");
            if (backgroundsEnv == null || backgroundsEnv.trim().isEmpty()) {
                backgroundsEnv = "local1.svg,local2.svg,local3.svg";
            }
        }
        
        List<Map<String, String>> backgrounds = new ArrayList<>();
        String[] bgArray = backgroundsEnv.split(",");
        
        for (String bg : bgArray) {
            bg = bg.trim();
            if (!bg.isEmpty()) {
                Map<String, String> bgMap = new HashMap<>();
                bgMap.put("name", bg);
                bgMap.put("url", "/backgrounds/" + bg);
                backgrounds.add(bgMap);
            }
        }
        
        return backgrounds;
    }
}



import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class BackgroundService {
    
    public List<Map<String, String>> getAvailableBackgrounds() {
        boolean isVercel = System.getenv("VERCEL") != null || System.getenv("VERCEL_ENV") != null;
        
        String backgroundsEnv;
        if (isVercel) {
            backgroundsEnv = System.getenv("VERCEL_BACKGROUNDS");
            if (backgroundsEnv == null || backgroundsEnv.trim().isEmpty()) {
                backgroundsEnv = "space1.svg,space2.svg,space3.svg";
            }
        } else {
            backgroundsEnv = System.getenv("LOCAL_BACKGROUNDS");
            if (backgroundsEnv == null || backgroundsEnv.trim().isEmpty()) {
                backgroundsEnv = "local1.svg,local2.svg,local3.svg";
            }
        }
        
        List<Map<String, String>> backgrounds = new ArrayList<>();
        String[] bgArray = backgroundsEnv.split(",");
        
        for (String bg : bgArray) {
            bg = bg.trim();
            if (!bg.isEmpty()) {
                Map<String, String> bgMap = new HashMap<>();
                bgMap.put("name", bg);
                bgMap.put("url", "/backgrounds/" + bg);
                backgrounds.add(bgMap);
            }
        }
        
        return backgrounds;
    }
}
















