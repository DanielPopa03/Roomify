import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Neutral, Spacing, Typography, BorderRadius } from '@/constants/theme';

const REASONS = [
    { label: 'Inappropriate / Vulgar', value: 'VULGAR_CONTENT' },
    { label: 'Misleading Content', value: 'MISLEADING' },
    { label: 'False Location', value: 'FALSE_LOCATION' },
    { label: 'Scam / Fraud', value: 'SCAM' },
    { label: 'Harassment', value: 'HARASSMENT' },
    { label: 'Other', value: 'OTHER' }
];

interface ReportModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (reason: string, description: string) => Promise<void>;
    targetName?: string; // e.g. "Message" or "Sunny Apartment"
}

export default function ReportModal({ visible, onClose, onSubmit, targetName }: ReportModalProps) {
    const [selectedReason, setSelectedReason] = useState(REASONS[0].value);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) {
            Alert.alert("Required", "Please select a reason.");
            return;
        }
        setLoading(true);
        try {
            await onSubmit(selectedReason, description);
            setDescription(''); // Reset form
            setSelectedReason(REASONS[0].value);
            onClose();
        } catch (error) {
            console.log("Modal submit error", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.overlay}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Report {targetName || 'Content'}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                            <Ionicons name="close" size={24} color={Neutral[500]} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionLabel}>Why are you reporting this?</Text>
                        <View style={styles.chipsContainer}>
                            {REASONS.map((r) => (
                                <TouchableOpacity
                                    key={r.value}
                                    style={[styles.chip, selectedReason === r.value && styles.chipSelected]}
                                    onPress={() => setSelectedReason(r.value)}
                                >
                                    <Text style={[styles.chipText, selectedReason === r.value && styles.chipTextSelected]}>
                                        {r.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.sectionLabel}>Description (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Please provide more details..."
                            multiline
                            numberOfLines={4}
                            value={description}
                            onChangeText={setDescription}
                        />

                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.submitText}>Submit Report</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    content: { backgroundColor: '#FFF', borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'], padding: Spacing.lg, maxHeight: '80%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    title: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Neutral[900] },
    sectionLabel: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Neutral[700], marginBottom: Spacing.sm, marginTop: Spacing.sm },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Neutral[300] },
    chipSelected: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
    chipText: { fontSize: 13, color: Neutral[600] },
    chipTextSelected: { color: '#B91C1C', fontWeight: 'bold' },
    input: { backgroundColor: Neutral[50], borderRadius: BorderRadius.md, padding: Spacing.md, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: Neutral[200] },
    submitButton: { backgroundColor: '#EF4444', padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.sm },
    submitText: { color: '#FFF', fontWeight: 'bold', fontSize: Typography.size.base }
});