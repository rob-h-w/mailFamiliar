package com.robwilliamson.mailfamiliar.model;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.exceptions.DataConsistencyException;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.io.Serializable;

import static com.robwilliamson.mailfamiliar.CopyProperties.copy;

@Data
public class ImapAccountDto implements Serializable {
  private int id;
  @NotBlank
  private String host;
  private float moveThreshold;
  @NotBlank
  private String name;
  @NotBlank
  private String password;
  private int port;
  private int refreshPeriodMinutes;
  private int syncPeriodDays;
  private boolean tls;
  private UserDto userDto;

  public static ImapAccountDto withDefaults(UserDto userDto) {
    final var imapAccount = new ImapAccountDto();
    imapAccount.setUserDto(userDto);
    imapAccount.setPort(993);
    imapAccount.setTls(true);
    imapAccount.setMoveThreshold(0.25f);
    imapAccount.setRefreshPeriodMinutes(30);
    imapAccount.setSyncPeriodDays(90);
    return imapAccount;
  }

  public static ImapAccountDto from(UserDto userDto, Imap imap) {
    if (userDto.getId() != imap.getUserId()) {
      throw new DataConsistencyException();
    }

    var model = copy(imap, new ImapAccountDto());
    model.setUserDto(userDto);
    return model;
  }
}
