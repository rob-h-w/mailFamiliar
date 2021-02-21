package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.Imap;

import javax.mail.Authenticator;
import java.util.Properties;

public interface StoreSettingsProvider {
  Authenticator getAuthenticatorFor(Imap imap);

  Properties getPropertiesFor(Imap imap);
}
