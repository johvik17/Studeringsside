package no.studyops.config;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.proc.SecurityContext;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

@Configuration
public class JwtConfig {

    @Bean
    SecretKey jwtSecretKey(@Value("${app.security.jwt.secret}") String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        // HS256 krever en "HmacSHA256" key
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
        return NimbusJwtDecoder.withSecretKey(jwtSecretKey).macAlgorithm(MacAlgorithm.HS256).build();
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
        
        byte[] keyBytes = jwtSecretKey.getEncoded();
        return new NimbusJwtEncoder(new ImmutableSecret<SecurityContext>(keyBytes));
    }
}