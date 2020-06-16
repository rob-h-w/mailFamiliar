package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.service.CryptoService;
import com.robwilliamson.mailfamiliar.service.imap.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.integration.mail.ImapMailReceiver;

import javax.mail.*;
import java.util.Properties;

@Configuration
@RequiredArgsConstructor
public class ImapSync {

  @Bean
  public MailReceiverFactory mailReceiverFactory() {
    return (imap, password) -> {
      final Properties properties = new Properties();
      properties.put("mail.imap.port", imap.getPort());
      properties.put("mail.imap.host", imap.getHost());
      properties.put("mail.imap.peek", true);
      if (imap.isTls()) {
        properties.put("mail.imap.socketFactory", "javax.net.ssl.SSLSocketFactory");
      }

      final ImapMailReceiver imapMailReceiver = new ImapMailReceiver();
      imapMailReceiver.setJavaMailAuthenticator(new Authenticator() {
        @Override
        protected PasswordAuthentication getPasswordAuthentication() {
          return new PasswordAuthentication(imap.getName(), password);
        }
      });
      imapMailReceiver.setJavaMailProperties(properties);
      imapMailReceiver.setShouldMarkMessagesAsRead(false);
      imapMailReceiver.setShouldDeleteMessages(false);
      return imapMailReceiver;
    };
  }

  @Bean
  public SynchronizerFactory synchronizerFactory(
      CryptoService cryptoService,
      MailReceiverFactory mailReceiverFactory) {
    return imap -> new Synchronizer(cryptoService, imap, mailReceiverFactory);
  }
}
