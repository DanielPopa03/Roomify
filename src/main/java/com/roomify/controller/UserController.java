package com.roomify.controller;

import com.roomify.model.User;
import com.roomify.service.UserService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/user/authorize")
    public User authorize() {
        return userService.getOrSyncUser();
    }
}
