package com.robwilliamson.mailfamiliar.entity;

import lombok.*;

import javax.persistence.*;
import java.io.Serializable;

@AllArgsConstructor
@Builder
@Data
@Entity
@Getter
@NoArgsConstructor
@Table(name = "encrypted")
public class Encrypted implements Serializable {
  public static final int GCM_NONCE_LENGTH = 12;
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private byte[] ciphertext;
  private byte[] nonce;
  private byte[] salt;
}
