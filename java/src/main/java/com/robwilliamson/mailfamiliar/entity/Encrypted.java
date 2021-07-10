package com.robwilliamson.mailfamiliar.entity;

import lombok.*;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import javax.persistence.*;
import java.io.Serializable;

import static com.robwilliamson.mailfamiliar.Equals.doEquals;

@AllArgsConstructor
@Builder
@Entity
@Getter
@NoArgsConstructor
@Setter
@Table(name = "encrypted")
@ToString
public class Encrypted implements Serializable {
  public static final int GCM_NONCE_LENGTH = 12;
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private byte[] ciphertext;
  private byte[] nonce;
  private byte[] salt;

  @Override
  public int hashCode() {
    return new HashCodeBuilder()
        .append(getCiphertext())
        .append(getNonce())
        .append(getSalt())
        .hashCode();
  }

  @Override
  public boolean equals(Object obj) {
    return doEquals(
        Encrypted.class,
        this,
        obj,
        (builder, right) -> builder
            .append(getCiphertext(), right.getCiphertext())
            .append(getNonce(), right.getNonce())
            .append(getSalt(), right.getSalt()));
  }
}
