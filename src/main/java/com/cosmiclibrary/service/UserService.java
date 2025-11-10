package com.cosmiclibrary.service;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class UserService {
    
    public List<Map<String, String>> getUsersFromEnv() {
        List<Map<String, String>> users = new ArrayList<>();
        String usersEnv = System.getenv("LIBRARY_USERS");
        
        if (usersEnv == null || usersEnv.trim().isEmpty()) {
            return users;
        }
        
        String[] pairs = usersEnv.split(",");
        for (String pair : pairs) {
            pair = pair.trim();
            if (pair.contains(":")) {
                String[] parts = pair.split(":", 2);
                if (parts.length == 2) {
                    Map<String, String> user = new HashMap<>();
                    user.put("username", parts[0].trim());
                    user.put("password", parts[1].trim());
                    users.add(user);
                }
            }
        }
        
        return users;
    }
    
    public boolean verifyPassword(String username, String password) {
        List<Map<String, String>> users = getUsersFromEnv();
        for (Map<String, String> user : users) {
            if (user.get("username").equals(username) && user.get("password").equals(password)) {
                return true;
            }
        }
        return false;
    }
    
    public boolean userExists(String username) {
        List<Map<String, String>> users = getUsersFromEnv();
        for (Map<String, String> user : users) {
            if (user.get("username").equals(username)) {
                return true;
            }
        }
        return false;
    }
}



import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class UserService {
    
    public List<Map<String, String>> getUsersFromEnv() {
        List<Map<String, String>> users = new ArrayList<>();
        String usersEnv = System.getenv("LIBRARY_USERS");
        
        if (usersEnv == null || usersEnv.trim().isEmpty()) {
            return users;
        }
        
        String[] pairs = usersEnv.split(",");
        for (String pair : pairs) {
            pair = pair.trim();
            if (pair.contains(":")) {
                String[] parts = pair.split(":", 2);
                if (parts.length == 2) {
                    Map<String, String> user = new HashMap<>();
                    user.put("username", parts[0].trim());
                    user.put("password", parts[1].trim());
                    users.add(user);
                }
            }
        }
        
        return users;
    }
    
    public boolean verifyPassword(String username, String password) {
        List<Map<String, String>> users = getUsersFromEnv();
        for (Map<String, String> user : users) {
            if (user.get("username").equals(username) && user.get("password").equals(password)) {
                return true;
            }
        }
        return false;
    }
    
    public boolean userExists(String username) {
        List<Map<String, String>> users = getUsersFromEnv();
        for (Map<String, String> user : users) {
            if (user.get("username").equals(username)) {
                return true;
            }
        }
        return false;
    }
}
















