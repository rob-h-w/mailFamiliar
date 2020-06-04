package com.robwilliamson.mailfamiliar.model;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.util.List;

import static com.robwilliamson.mailfamiliar.CopyProperties.copy;

@Data
public class User {
  private int id;
  private List<Imap> imaps;
  @NotBlank
  private String name;
  @NotBlank
  private String remoteId;

  public static User from(com.robwilliamson.mailfamiliar.entity.User entity) {
    return copy(entity, new User());
  }
}
