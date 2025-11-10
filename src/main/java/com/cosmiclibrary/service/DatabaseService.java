package com.cosmiclibrary.service;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import org.springframework.stereotype.Service;

import java.io.*;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;

@Service
public class DatabaseService {
    private static final String DB_PATH = "database.json";
    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    public Map<String, Object> readDatabase() {
        try {
            File file = new File(DB_PATH);
            if (!file.exists()) {
                return createDefaultDatabase();
            }
            
            String content = new String(Files.readAllBytes(Paths.get(DB_PATH)), StandardCharsets.UTF_8);
            Type type = new TypeToken<Map<String, Object>>(){}.getType();
            Map<String, Object> db = gson.fromJson(content, type);
            
            if (db == null) {
                return createDefaultDatabase();
            }
            
            return db;
        } catch (Exception e) {
            System.err.println("Ошибка чтения базы данных: " + e.getMessage());
            return createDefaultDatabase();
        }
    }

    public void saveDatabase(Map<String, Object> db) {
        try {
            String json = gson.toJson(db);
            Files.write(Paths.get(DB_PATH), json.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            System.err.println("Ошибка сохранения базы данных: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getBooks() {
        Map<String, Object> db = readDatabase();
        Object booksObj = db.get("books");
        if (booksObj instanceof List) {
            return (List<Map<String, Object>>) booksObj;
        }
        return new ArrayList<>();
    }

    @SuppressWarnings("unchecked")
    public void saveBooks(List<Map<String, Object>> books) {
        Map<String, Object> db = readDatabase();
        db.put("books", books);
        saveDatabase(db);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getSettings() {
        Map<String, Object> db = readDatabase();
        Object settingsObj = db.get("settings");
        if (settingsObj instanceof Map) {
            return (Map<String, Object>) settingsObj;
        }
        Map<String, Object> defaultSettings = new HashMap<>();
        defaultSettings.put("background", null);
        defaultSettings.put("backgroundType", "default");
        return defaultSettings;
    }

    @SuppressWarnings("unchecked")
    public void saveSettings(Map<String, Object> settings) {
        Map<String, Object> db = readDatabase();
        db.put("settings", settings);
        saveDatabase(db);
    }

    private Map<String, Object> createDefaultDatabase() {
        Map<String, Object> db = new HashMap<>();
        db.put("users", new ArrayList<>());
        db.put("books", new ArrayList<>());
        
        Map<String, Object> settings = new HashMap<>();
        settings.put("background", null);
        settings.put("backgroundType", "default");
        db.put("settings", settings);
        
        saveDatabase(db);
        return db;
    }
}



import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import org.springframework.stereotype.Service;

import java.io.*;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;

@Service
public class DatabaseService {
    private static final String DB_PATH = "database.json";
    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    public Map<String, Object> readDatabase() {
        try {
            File file = new File(DB_PATH);
            if (!file.exists()) {
                return createDefaultDatabase();
            }
            
            String content = new String(Files.readAllBytes(Paths.get(DB_PATH)), StandardCharsets.UTF_8);
            Type type = new TypeToken<Map<String, Object>>(){}.getType();
            Map<String, Object> db = gson.fromJson(content, type);
            
            if (db == null) {
                return createDefaultDatabase();
            }
            
            return db;
        } catch (Exception e) {
            System.err.println("Ошибка чтения базы данных: " + e.getMessage());
            return createDefaultDatabase();
        }
    }

    public void saveDatabase(Map<String, Object> db) {
        try {
            String json = gson.toJson(db);
            Files.write(Paths.get(DB_PATH), json.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            System.err.println("Ошибка сохранения базы данных: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getBooks() {
        Map<String, Object> db = readDatabase();
        Object booksObj = db.get("books");
        if (booksObj instanceof List) {
            return (List<Map<String, Object>>) booksObj;
        }
        return new ArrayList<>();
    }

    @SuppressWarnings("unchecked")
    public void saveBooks(List<Map<String, Object>> books) {
        Map<String, Object> db = readDatabase();
        db.put("books", books);
        saveDatabase(db);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getSettings() {
        Map<String, Object> db = readDatabase();
        Object settingsObj = db.get("settings");
        if (settingsObj instanceof Map) {
            return (Map<String, Object>) settingsObj;
        }
        Map<String, Object> defaultSettings = new HashMap<>();
        defaultSettings.put("background", null);
        defaultSettings.put("backgroundType", "default");
        return defaultSettings;
    }

    @SuppressWarnings("unchecked")
    public void saveSettings(Map<String, Object> settings) {
        Map<String, Object> db = readDatabase();
        db.put("settings", settings);
        saveDatabase(db);
    }

    private Map<String, Object> createDefaultDatabase() {
        Map<String, Object> db = new HashMap<>();
        db.put("users", new ArrayList<>());
        db.put("books", new ArrayList<>());
        
        Map<String, Object> settings = new HashMap<>();
        settings.put("background", null);
        settings.put("backgroundType", "default");
        db.put("settings", settings);
        
        saveDatabase(db);
        return db;
    }
}
















