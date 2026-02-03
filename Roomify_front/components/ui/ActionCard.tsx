/**
 * ActionCard Component
 * Renders interactive cards for viewing proposals and rent proposals.
 * Shows different UI based on action type and sender.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Blue, Neutral, Semantic, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import type { ChatMessageMetadata } from '@/constants/types';
import { usePayment } from '@/hooks/usePayment';

interface ActionCardProps {
    metadata: ChatMessageMetadata;
    sender: 'me' | 'other' | 'system';
    timestamp: string;
    onAcceptViewing?: () => void;
    onPayRent?: () => void;
}

export function ActionCard({ 
    metadata, 
    sender, 
    timestamp,
    onAcceptViewing,
    onPayRent 
}: ActionCardProps) {
    const isMyCard = sender === 'me';
    const { openPaymentSheet, loading: isPaying } = usePayment();

    const handlePayRent = () => {
        if (metadata.leaseId) {
             openPaymentSheet(metadata.leaseId.toString(), onPayRent);
        }
    };
    
    if (metadata.action === 'VIEWING_PROPOSAL') {
        return (
            <View style={[styles.container, isMyCard ? styles.myCard : styles.theirCard]}>
                <View style={styles.cardContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.iconBadge, { backgroundColor: Blue[100] }]}>
                            <Ionicons name="calendar-outline" size={20} color={Blue[600]} />
                        </View>
                        <View style={styles.headerText}>
                            <Text style={styles.title}>Viewing Proposal</Text>
                            <Text style={styles.subtitle}>
                                {isMyCard ? 'You proposed' : 'They proposed'}
                            </Text>
                        </View>
                    </View>
                    
                    {/* Date Display */}
                    <View style={styles.dateBox}>
                        <Ionicons name="time-outline" size={16} color={Blue[600]} />
                        <Text style={styles.dateText}>
                            {metadata.formattedDate || metadata.date || 'Date pending'}
                        </Text>
                    </View>
                    
                    {/* Action Button or Status */}
                    {!isMyCard && onAcceptViewing ? (
                        <TouchableOpacity style={styles.acceptButton} onPress={onAcceptViewing}>
                            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                            <Text style={styles.acceptButtonText}>Accept Viewing</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.statusBadge}>
                            <Ionicons name="hourglass-outline" size={14} color={Neutral[500]} />
                            <Text style={styles.statusText}>Waiting for response...</Text>
                        </View>
                    )}
                    
                    <Text style={styles.timestamp}>{timestamp}</Text>
                </View>
            </View>
        );
    }
    
    if (metadata.action === 'RENT_PROPOSAL') {
        const formattedPrice = metadata.price?.toLocaleString() || '—';
        const currency = metadata.currency || 'EUR';
        const isAlreadyPaid = metadata.leaseStatus === 'ACTIVE';
        
        return (
            <View style={[styles.container, isMyCard ? styles.myCard : styles.theirCard]}>
                <View style={styles.cardContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.iconBadge, { backgroundColor: Semantic.successLight }]}>
                            <Ionicons name="home-outline" size={20} color={Semantic.success} />
                        </View>
                        <View style={styles.headerText}>
                            <Text style={styles.title}>Rent Proposal</Text>
                            <Text style={styles.subtitle}>
                                {isMyCard ? 'You sent an offer' : 'Landlord sent you an offer'}
                            </Text>
                        </View>
                    </View>
                    
                    {/* Price Display */}
                    <View style={styles.priceBox}>
                        <Text style={styles.priceLabel}>Monthly Rent</Text>
                        <Text style={styles.priceValue}>{currency} {formattedPrice}</Text>
                        {metadata.startDate && (
                            <Text style={styles.startDate}>
                                Starting {metadata.startDate}
                            </Text>
                        )}
                    </View>
                    
                    {/* Action Button or Status */}
                    {isAlreadyPaid ? (
                        <View style={[styles.statusBadge, { backgroundColor: Semantic.successLight }]}>
                            <Ionicons name="checkmark-circle" size={14} color={Semantic.success} />
                            <Text style={[styles.statusText, { color: Semantic.success }]}>Paid - Lease Active</Text>
                        </View>
                    ) : !isMyCard && onPayRent ? (
                        <TouchableOpacity 
                            style={[styles.acceptButton, { backgroundColor: Semantic.success }]} 
                            onPress={handlePayRent}
                            disabled={isPaying}
                        >
                            {isPaying ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="card-outline" size={18} color="#fff" />
                                    <Text style={styles.acceptButtonText}>Pay & Sign Lease</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.statusBadge}>
                            <Ionicons name="paper-plane-outline" size={14} color={Neutral[500]} />
                            <Text style={styles.statusText}>Offer sent</Text>
                        </View>
                    )}
                    
                    <Text style={styles.timestamp}>{timestamp}</Text>
                </View>
            </View>
        );
    }
    
    // Fallback for unknown action types
    return null;
}

const styles = StyleSheet.create({
    container: {
        maxWidth: '85%',
        marginBottom: Spacing.md,
    },
    myCard: {
        alignSelf: 'flex-end',
    },
    theirCard: {
        alignSelf: 'flex-start',
    },
    cardContent: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Neutral[200],
        ...Shadows.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    iconBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: Typography.size.base,
        fontWeight: Typography.weight.semibold,
        color: Neutral[900],
    },
    subtitle: {
        fontSize: Typography.size.xs,
        color: Neutral[500],
        marginTop: 2,
    },
    dateBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Blue[50],
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.base,
        marginBottom: Spacing.md,
    },
    dateText: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.medium,
        color: Blue[700],
        marginLeft: Spacing.sm,
    },
    priceBox: {
        backgroundColor: Semantic.successLight,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.base,
        marginBottom: Spacing.md,
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: Typography.size.xs,
        color: Neutral[600],
        marginBottom: 4,
    },
    priceValue: {
        fontSize: Typography.size['2xl'],
        fontWeight: Typography.weight.bold,
        color: Semantic.success,
    },
    startDate: {
        fontSize: Typography.size.xs,
        color: Neutral[500],
        marginTop: 4,
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Blue[600],
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.base,
        marginBottom: Spacing.sm,
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.semibold,
        marginLeft: Spacing.xs,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    statusText: {
        fontSize: Typography.size.xs,
        color: Neutral[500],
        marginLeft: 4,
    },
    timestamp: {
        fontSize: 10,
        color: Neutral[400],
        textAlign: 'right',
    },
});
