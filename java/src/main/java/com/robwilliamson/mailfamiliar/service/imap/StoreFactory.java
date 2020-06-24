package com.robwilliamson.mailfamiliar.service.imap;

import javax.mail.*;
import java.util.Properties;

public interface StoreFactory {
  Store getInstance(Properties props, Authenticator authenticator) throws NoSuchProviderException;
}
