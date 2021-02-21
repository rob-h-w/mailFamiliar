package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.repository.NgramRepository;
import com.robwilliamson.mailfamiliar.service.PredictorStringOwnershipService;
import com.robwilliamson.mailfamiliar.service.predictor.NgramPredictor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;

@Configuration
@RequiredArgsConstructor
public class PredictorConfig {
  private final NgramRepository ngramRepository;
  private final PredictorStringOwnershipService predictorStringOwnershipService;

  @Bean
  com.robwilliamson.mailfamiliar.service.predictor.Predictor predictor() {
    return new NgramPredictor(ngramRepository, predictorStringOwnershipService);
  }
}
