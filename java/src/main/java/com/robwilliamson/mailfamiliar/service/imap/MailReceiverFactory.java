package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.Imap;
import org.springframework.integration.mail.ImapMailReceiver;

public interface MailReceiverFactory {
  ImapMailReceiver create(Imap imap, String password);
}
