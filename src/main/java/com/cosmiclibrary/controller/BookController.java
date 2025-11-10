package com.cosmiclibrary.controller;

import com.cosmiclibrary.service.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/books")
public class BookController {
    
    @Autowired
    private DatabaseService databaseService;
    
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getBooks() {
        List<Map<String, Object>> books = databaseService.getBooks();
        return ResponseEntity.ok(books);
    }
    
    @PostMapping
    public ResponseEntity<Map<String, Object>> addBook(@RequestBody Map<String, Object> bookData) {
        String title = (String) bookData.get("title");
        String author = (String) bookData.get("author");
        String genre = (String) bookData.get("genre");
        
        if (title == null || author == null || genre == null || 
            title.trim().isEmpty() || author.trim().isEmpty() || genre.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "title, author и genre обязательны");
            return ResponseEntity.badRequest().body(error);
        }
        
        List<Map<String, Object>> books = databaseService.getBooks();
        
        // Генерируем или используем заданный ID
        Integer newId;
        Object idObj = bookData.get("id");
        if (idObj != null) {
            try {
                newId = idObj instanceof Integer ? (Integer) idObj : Integer.parseInt(idObj.toString());
                // Проверяем уникальность
                for (Map<String, Object> book : books) {
                    Object bookId = book.get("id");
                    if (bookId != null && bookId.equals(newId)) {
                        Map<String, Object> error = new HashMap<>();
                        error.put("error", "Книга с ID " + newId + " уже существует");
                        return ResponseEntity.badRequest().body(error);
                    }
                }
            } catch (NumberFormatException e) {
                newId = null;
            }
        } else {
            newId = null;
        }
        
        if (newId == null) {
            // Генерируем новый ID
            int maxId = 0;
            for (Map<String, Object> book : books) {
                Object bookId = book.get("id");
                if (bookId instanceof Integer) {
                    maxId = Math.max(maxId, (Integer) bookId);
                } else if (bookId instanceof Number) {
                    maxId = Math.max(maxId, ((Number) bookId).intValue());
                }
            }
            newId = maxId + 1;
        }
        
        Map<String, Object> newBook = new HashMap<>();
        newBook.put("id", newId);
        newBook.put("title", title);
        newBook.put("author", author);
        newBook.put("genre", genre);
        newBook.put("description", bookData.getOrDefault("description", ""));
        newBook.put("cover", bookData.getOrDefault("cover", "https://via.placeholder.com/150"));
        newBook.put("addedBy", bookData.getOrDefault("added_by", "неизвестно"));
        
        books.add(newBook);
        databaseService.saveBooks(books);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Книга добавлена");
        response.put("id", newId);
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping
    public ResponseEntity<Map<String, Object>> deleteBook(@RequestParam String id) {
        if (id == null || id.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "ID обязателен");
            return ResponseEntity.badRequest().body(error);
        }
        
        try {
            int bookId = Integer.parseInt(id);
            List<Map<String, Object>> books = databaseService.getBooks();
            
            boolean removed = books.removeIf(book -> {
                Object bookIdObj = book.get("id");
                if (bookIdObj instanceof Integer) {
                    return bookIdObj.equals(bookId);
                } else if (bookIdObj instanceof Number) {
                    return ((Number) bookIdObj).intValue() == bookId;
                }
                return false;
            });
            
            if (!removed) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Книга не найдена");
                return ResponseEntity.status(404).body(error);
            }
            
            databaseService.saveBooks(books);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Книга удалена");
            return ResponseEntity.ok(response);
        } catch (NumberFormatException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Неверный формат ID");
            return ResponseEntity.badRequest().body(error);
        }
    }
}



import com.cosmiclibrary.service.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/books")
public class BookController {
    
    @Autowired
    private DatabaseService databaseService;
    
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getBooks() {
        List<Map<String, Object>> books = databaseService.getBooks();
        return ResponseEntity.ok(books);
    }
    
    @PostMapping
    public ResponseEntity<Map<String, Object>> addBook(@RequestBody Map<String, Object> bookData) {
        String title = (String) bookData.get("title");
        String author = (String) bookData.get("author");
        String genre = (String) bookData.get("genre");
        
        if (title == null || author == null || genre == null || 
            title.trim().isEmpty() || author.trim().isEmpty() || genre.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "title, author и genre обязательны");
            return ResponseEntity.badRequest().body(error);
        }
        
        List<Map<String, Object>> books = databaseService.getBooks();
        
        // Генерируем или используем заданный ID
        Integer newId;
        Object idObj = bookData.get("id");
        if (idObj != null) {
            try {
                newId = idObj instanceof Integer ? (Integer) idObj : Integer.parseInt(idObj.toString());
                // Проверяем уникальность
                for (Map<String, Object> book : books) {
                    Object bookId = book.get("id");
                    if (bookId != null && bookId.equals(newId)) {
                        Map<String, Object> error = new HashMap<>();
                        error.put("error", "Книга с ID " + newId + " уже существует");
                        return ResponseEntity.badRequest().body(error);
                    }
                }
            } catch (NumberFormatException e) {
                newId = null;
            }
        } else {
            newId = null;
        }
        
        if (newId == null) {
            // Генерируем новый ID
            int maxId = 0;
            for (Map<String, Object> book : books) {
                Object bookId = book.get("id");
                if (bookId instanceof Integer) {
                    maxId = Math.max(maxId, (Integer) bookId);
                } else if (bookId instanceof Number) {
                    maxId = Math.max(maxId, ((Number) bookId).intValue());
                }
            }
            newId = maxId + 1;
        }
        
        Map<String, Object> newBook = new HashMap<>();
        newBook.put("id", newId);
        newBook.put("title", title);
        newBook.put("author", author);
        newBook.put("genre", genre);
        newBook.put("description", bookData.getOrDefault("description", ""));
        newBook.put("cover", bookData.getOrDefault("cover", "https://via.placeholder.com/150"));
        newBook.put("addedBy", bookData.getOrDefault("added_by", "неизвестно"));
        
        books.add(newBook);
        databaseService.saveBooks(books);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Книга добавлена");
        response.put("id", newId);
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping
    public ResponseEntity<Map<String, Object>> deleteBook(@RequestParam String id) {
        if (id == null || id.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "ID обязателен");
            return ResponseEntity.badRequest().body(error);
        }
        
        try {
            int bookId = Integer.parseInt(id);
            List<Map<String, Object>> books = databaseService.getBooks();
            
            boolean removed = books.removeIf(book -> {
                Object bookIdObj = book.get("id");
                if (bookIdObj instanceof Integer) {
                    return bookIdObj.equals(bookId);
                } else if (bookIdObj instanceof Number) {
                    return ((Number) bookIdObj).intValue() == bookId;
                }
                return false;
            });
            
            if (!removed) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Книга не найдена");
                return ResponseEntity.status(404).body(error);
            }
            
            databaseService.saveBooks(books);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Книга удалена");
            return ResponseEntity.ok(response);
        } catch (NumberFormatException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Неверный формат ID");
            return ResponseEntity.badRequest().body(error);
        }
    }
}
















