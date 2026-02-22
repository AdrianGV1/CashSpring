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
     * Genera URL para Apple Maps (iOS)
     */
    public static String generateAppleMapsUrl(double lat, double lng) {
        return String.format(Locale.US, "https://maps.apple.com/?ll=%.6f,%.6f", lat, lng);
    }
}