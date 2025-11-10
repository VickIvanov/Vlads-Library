package com.cosmiclibrary.controller;

import com.cosmiclibrary.service.DatabaseService;
import com.cosmiclibrary.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private DatabaseService databaseService;
    
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> userData) {
        String username = userData.get("username");
        String password = userData.get("password");
        
        if (username == null || password == null || username.trim().isEmpty() || password.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Заполните все поля");
            return ResponseEntity.badRequest().body(error);
        }
        
        if (userService.userExists(username)) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Пользователь с таким именем уже существует в системе (.env)");
            return ResponseEntity.badRequest().body(error);
        }
        
        // Проверяем в БД
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> dbUsers = (List<Map<String, Object>>) databaseService.readDatabase().get("users");
        if (dbUsers == null) {
            dbUsers = new ArrayList<>();
        }
        
        for (Map<String, Object> user : dbUsers) {
            if (username.equals(user.get("username"))) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Пользователь уже существует");
                return ResponseEntity.badRequest().body(error);
            }
        }
        
        // Добавляем в БД
        Map<String, Object> newUser = new HashMap<>();
        newUser.put("username", username);
        newUser.put("password", password);
        newUser.put("created_at", System.currentTimeMillis());
        dbUsers.add(newUser);
        
        Map<String, Object> db = databaseService.readDatabase();
        db.put("users", dbUsers);
        databaseService.saveDatabase(db);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Пользователь " + username + " зарегистрирован!");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> userData) {
        String username = userData.get("username");
        String password = userData.get("password");
        
        if (username == null || password == null || username.trim().isEmpty() || password.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Заполните все поля");
            return ResponseEntity.badRequest().body(error);
        }
        
        // Проверяем в .env
        if (userService.verifyPassword(username, password)) {
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Вход выполнен успешно");
            response.put("username", username);
            response.put("source", "env");
            return ResponseEntity.ok(response);
        }
        
        // Проверяем в БД
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> dbUsers = (List<Map<String, Object>>) databaseService.readDatabase().get("users");
        if (dbUsers != null) {
            for (Map<String, Object> user : dbUsers) {
                if (username.equals(user.get("username")) && password.equals(user.get("password"))) {
                    Map<String, Object> response = new HashMap<>();
                    response.put("message", "Вход выполнен успешно");
                    response.put("username", username);
                    response.put("source", "database");
                    return ResponseEntity.ok(response);
                }
            }
        }
        
        // Проверяем существование пользователя
        if (userService.userExists(username)) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Неверный пароль");
            return ResponseEntity.status(401).body(error);
        }
        
        Map<String, Object> error = new HashMap<>();
        error.put("error", "Пользователь не найден");
        return ResponseEntity.status(401).body(error);
    }
}



import com.cosmiclibrary.service.DatabaseService;
import com.cosmiclibrary.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class UserController {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private DatabaseService databaseService;
    
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> userData) {
        String username = userData.get("username");
        String password = userData.get("password");
        
        if (username == null || password == null || username.trim().isEmpty() || password.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Заполните все поля");
            return ResponseEntity.badRequest().body(error);
        }
        
        if (userService.userExists(username)) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Пользователь с таким именем уже существует в системе (.env)");
            return ResponseEntity.badRequest().body(error);
        }
        
        // Проверяем в БД
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> dbUsers = (List<Map<String, Object>>) databaseService.readDatabase().get("users");
        if (dbUsers == null) {
            dbUsers = new ArrayList<>();
        }
        
        for (Map<String, Object> user : dbUsers) {
            if (username.equals(user.get("username"))) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Пользователь уже существует");
                return ResponseEntity.badRequest().body(error);
            }
        }
        
        // Добавляем в БД
        Map<String, Object> newUser = new HashMap<>();
        newUser.put("username", username);
        newUser.put("password", password);
        newUser.put("created_at", System.currentTimeMillis());
        dbUsers.add(newUser);
        
        Map<String, Object> db = databaseService.readDatabase();
        db.put("users", dbUsers);
        databaseService.saveDatabase(db);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Пользователь " + username + " зарегистрирован!");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> userData) {
        String username = userData.get("username");
        String password = userData.get("password");
        
        if (username == null || password == null || username.trim().isEmpty() || password.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Заполните все поля");
            return ResponseEntity.badRequest().body(error);
        }
        
        // Проверяем в .env
        if (userService.verifyPassword(username, password)) {
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Вход выполнен успешно");
            response.put("username", username);
            response.put("source", "env");
            return ResponseEntity.ok(response);
        }
        
        // Проверяем в БД
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> dbUsers = (List<Map<String, Object>>) databaseService.readDatabase().get("users");
        if (dbUsers != null) {
            for (Map<String, Object> user : dbUsers) {
                if (username.equals(user.get("username")) && password.equals(user.get("password"))) {
                    Map<String, Object> response = new HashMap<>();
                    response.put("message", "Вход выполнен успешно");
                    response.put("username", username);
                    response.put("source", "database");
                    return ResponseEntity.ok(response);
                }
            }
        }
        
        // Проверяем существование пользователя
        if (userService.userExists(username)) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Неверный пароль");
            return ResponseEntity.status(401).body(error);
        }
        
        Map<String, Object> error = new HashMap<>();
        error.put("error", "Пользователь не найден");
        return ResponseEntity.status(401).body(error);
    }
}
















