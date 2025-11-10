package com.cosmiclibrary.controller;

import com.cosmiclibrary.service.BackgroundService;
import com.cosmiclibrary.service.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    
    @Autowired
    private DatabaseService databaseService;
    
    @Autowired
    private BackgroundService backgroundService;
    
    @GetMapping
    public ResponseEntity<Map<String, Object>> getSettings() {
        Map<String, Object> settings = databaseService.getSettings();
        List<Map<String, String>> backgrounds = backgroundService.getAvailableBackgrounds();
        
        Map<String, Object> response = new HashMap<>();
        response.put("settings", settings);
        response.put("availableBackgrounds", backgrounds);
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping
    public ResponseEntity<Map<String, Object>> saveSettings(@RequestBody Map<String, Object> settingsData) {
        Map<String, Object> settings = new HashMap<>();
        settings.put("background", settingsData.get("background"));
        settings.put("backgroundType", settingsData.getOrDefault("backgroundType", "default"));
        
        databaseService.saveSettings(settings);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Настройки сохранены");
        response.put("settings", settings);
        
        return ResponseEntity.ok(response);
    }
}



import com.cosmiclibrary.service.BackgroundService;
import com.cosmiclibrary.service.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    
    @Autowired
    private DatabaseService databaseService;
    
    @Autowired
    private BackgroundService backgroundService;
    
    @GetMapping
    public ResponseEntity<Map<String, Object>> getSettings() {
        Map<String, Object> settings = databaseService.getSettings();
        List<Map<String, String>> backgrounds = backgroundService.getAvailableBackgrounds();
        
        Map<String, Object> response = new HashMap<>();
        response.put("settings", settings);
        response.put("availableBackgrounds", backgrounds);
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping
    public ResponseEntity<Map<String, Object>> saveSettings(@RequestBody Map<String, Object> settingsData) {
        Map<String, Object> settings = new HashMap<>();
        settings.put("background", settingsData.get("background"));
        settings.put("backgroundType", settingsData.getOrDefault("backgroundType", "default"));
        
        databaseService.saveSettings(settings);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Настройки сохранены");
        response.put("settings", settings);
        
        return ResponseEntity.ok(response);
    }
}
















