package com.robwilliamson.mailfamiliar.model;

import com.robwilliamson.mailfamiliar.entity.User;
import lombok.Data;

import javax.validation.constraints.NotBlank;

import static com.robwilliamson.mailfamiliar.CopyProperties.copy;

@Data
public class UserDto {
  private int id;
  @NotBlank
  private String name;
  @NotBlank
  private String remoteId;

  public static UserDto from(User user) {
    return copy(user, new UserDto());
  }
}
