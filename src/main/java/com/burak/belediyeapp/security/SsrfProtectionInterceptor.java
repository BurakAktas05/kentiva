package com.burak.belediyeapp.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;

/**
 * SSRF (Server-Side Request Forgery) koruma interseptörü.
 * Harici HTTP isteklerinde (Nominatim, OSM, mediaFetcher) hedef host'un
 * local/internal IP adreslerine (127.0.0.1, 10.0.0.0/8, fe80:: vb.) çözümlenmesini engelleyerek
 * sunucu içi kaynak sızıntılarını önler.
 */
@Slf4j
public class SsrfProtectionInterceptor implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        URI uri = request.getURI();
        String host = uri.getHost();
        if (host != null) {
            try {
                InetAddress[] addresses = InetAddress.getAllByName(host);
                for (InetAddress address : addresses) {
                    if (isPrivateIp(address)) {
                        log.warn("Blocked SSRF request to host '{}' resolving to private/restricted IP '{}'", host, address.getHostAddress());
                        throw new IOException("Blocked request to restricted internal or private network");
                    }
                }
            } catch (Exception e) {
                if (e instanceof IOException) {
                    throw (IOException) e;
                }
                throw new IOException("DNS resolution failed for SSRF verification", e);
            }
        }
        return execution.execute(request, body);
    }

    private boolean isPrivateIp(InetAddress address) {
        return address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isAnyLocalAddress()
                || isIpInPrivateSubnet(address.getHostAddress());
    }

    private boolean isIpInPrivateSubnet(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }
        // JVM site-local checks covers standard subnets, but we hardening with string prefixes
        String normalized = ip.trim().toLowerCase();
        return normalized.startsWith("127.")
                || normalized.startsWith("10.")
                || normalized.startsWith("192.168.")
                || normalized.startsWith("169.254.")
                || normalized.startsWith("0.")
                || normalized.equals("::1")
                || normalized.startsWith("fe80:")
                || normalized.startsWith("fc00:")
                || normalized.startsWith("fd00:");
    }
}
