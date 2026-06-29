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
        validatePublicHttpUri(request.getURI());
        return execution.execute(request, body);
    }

    public static URI validatePublicHttpUri(String rawUrl) throws IOException {
        try {
            return validatePublicHttpUri(URI.create(rawUrl));
        } catch (IllegalArgumentException e) {
            throw new IOException("Invalid URL", e);
        }
    }

    public static URI validatePublicHttpUri(URI uri) throws IOException {
        if (uri == null) {
            throw new IOException("Target URL is required");
        }
        String scheme = uri.getScheme();
        if (scheme == null || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
            throw new IOException("Only http/https URLs are allowed");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IOException("Target URL must contain a valid host");
        }
        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress address : addresses) {
                if (isPrivateIp(address)) {
                    log.warn("Blocked SSRF request to host '{}' resolving to private/restricted IP '{}'", host, address.getHostAddress());
                    throw new IOException("Blocked request to restricted internal or private network");
                }
            }
            return uri;
        } catch (IOException e) {
            throw e;
        } catch (Exception e) {
            throw new IOException("DNS resolution failed for SSRF verification", e);
        }
    }

    private static boolean isPrivateIp(InetAddress address) {
        return address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isAnyLocalAddress()
                || isIpInPrivateSubnet(address.getHostAddress());
    }

    private static boolean isIpInPrivateSubnet(String ip) {
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
