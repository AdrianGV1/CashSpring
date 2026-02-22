package com.proyect.CashSpring.domain.util;

import java.util.Locale;

public class MapUrlGenerator {

    /**
     * Genera URL para Google Maps
     */
    public static String generateGoogleMapsUrl(double lat, double lng) {
        return String.format(Locale.US, "https://www.google.com/maps?q=%.6f,%.6f", lat, lng);
    }

    /**
     * Genera URL para Waze
     */
    public static String generateWazeUrl(double lat, double lng) {
        return String.format(Locale.US, "https://waze.com/ul?ll=%.6f,%.6f&navigate=yes", lat, lng);
    }

    /**
     * Genera URL para compartir por WhatsApp
     */
    public static String generateWhatsAppLocationUrl(double lat, double lng) {
        String googleMapsUrl = generateGoogleMapsUrl(lat, lng);
        return String.format("https://wa.me/?text=%s",
            java.net.URLEncoder.encode("Ubicación: " + googleMapsUrl,
                java.nio.charset.StandardCharsets.UTF_8));
    }
}