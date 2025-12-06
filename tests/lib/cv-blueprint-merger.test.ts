import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mergeCVIntoBlueprint } from '@/lib/cv-blueprint-merger'

const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn()
}

describe('CV Blueprint Merger', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Set up default RPC mock for each test
        mockSupabase.rpc.mockResolvedValue({ data: 'blueprint-123', error: null })
    })

    describe('mergeCVIntoBlueprint', () => {
        it('should merge new CV data into existing blueprint', async () => {
            const existingBlueprint = {
                id: 'blueprint_123',
                profile_data: {
                    personal: { name: 'John Doe' },
                    contact: { email: 'john@example.com' },
                    experience: [{ role: 'Developer', company: 'Old Corp', duration: '2018-2022', confidence: 0.9 }],
                    education: [{ degree: 'BS', institution: 'University', year: '2018', confidence: 0.9 }],
                    skills: [{ name: 'JavaScript', confidence: 0.8, sources: ['cv1'] }]
                },
                total_cvs_processed: 1,
                blueprint_version: 1,
                confidence_score: 0.7,
                data_completeness: 0.8
            }

            const newCV = {
                name: 'John Doe',
                contactInfo: { email: 'john@example.com', phone: '+1234567890' },
                experience: [{ role: 'Senior Developer', company: 'New Corp', duration: '2022-2024' }],
                skills: ['JavaScript', 'React', 'Node.js'],
                education: [{ degree: 'MS', institution: 'University', year: '2022' }]
            }

            // Mock existing blueprint fetch
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'cv_blueprints') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: existingBlueprint, error: null })
                            })
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({ data: { ...existingBlueprint, blueprint_version: 2 }, error: null })
                                })
                            })
                        })
                    }
                }
                return {}
            })

            // Mock change recording - the RPC should return different values for different calls
            mockSupabase.rpc.mockImplementation((functionName) => {
                if (functionName === 'get_or_create_cv_blueprint') {
                    return Promise.resolve({ data: 'blueprint-123', error: null })
                }
                // For change recording
                return Promise.resolve(null)
            })

            const result = await mergeCVIntoBlueprint(mockSupabase as any, 'user_123', newCV, 'cv_hash_123')

            expect(result.blueprint).toBeDefined()
            expect(result.changes.length).toBeGreaterThan(0)
            expect(result.mergeSummary.newSkills).toBeGreaterThan(0)
            expect(mockSupabase.rpc).toHaveBeenCalledWith('record_blueprint_change', expect.any(Object))
        })

        it('should create new blueprint if none exists', async () => {
            const newCV = {
                name: 'Jane Smith',
                contactInfo: { email: 'jane@example.com' },
                experience: [{ role: 'Developer', company: 'Tech Corp', duration: '2020-2024' }],
                skills: ['Python', 'Django'],
                education: [{ degree: 'BS', institution: 'College', year: '2020' }]
            }

            const newBlueprint = {
                id: 'new_blueprint_123',
                profile_data: {
                    personal: { name: 'Jane Smith' },
                    contact: { email: 'jane@example.com' },
                    experience: [expect.objectContaining({ role: 'Developer' })],
                    education: [expect.objectContaining({ degree: 'BS' })],
                    skills: [expect.objectContaining({ name: 'Python' })]
                },
                total_cvs_processed: 1,
                blueprint_version: 1,
                confidence_score: expect.any(Number),
                data_completeness: expect.any(Number)
            }

            // Mock no existing blueprint initially
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'cv_blueprints') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: null, error: null })
                            })
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({ data: newBlueprint, error: null })
                                })
                            })
                        })
                    }
                }
                return {}
            })

            // Mock RPC to return blueprint ID
            mockSupabase.rpc.mockResolvedValue({ data: 'new_blueprint_123', error: null })

            const result = await mergeCVIntoBlueprint(mockSupabase as any, 'user_123', newCV, 'cv_hash_123')

            expect(result.blueprint).toBeDefined()
            expect(result.blueprint.id).toBe('new_blueprint_123')
            expect(mockSupabase.rpc).toHaveBeenCalledWith('get_or_create_cv_blueprint', { p_user_id: 'user_123' })
        })

        it('should handle skills deduplication and confidence updates', async () => {
            const existingBlueprint = {
                id: 'blueprint_123',
                profile_data: {
                    personal: { name: 'John Doe' },
                    contact: {},
                    experience: [],
                    education: [],
                    skills: [{ name: 'JavaScript', confidence: 0.6, sources: ['cv1'] }]
                },
                total_cvs_processed: 1
            }

            const newCV = {
                name: 'John Doe',
                contactInfo: {},
                experience: [],
                skills: ['JavaScript', 'TypeScript'], // JavaScript repeated, TypeScript new
                education: []
            }

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'cv_blueprints') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: existingBlueprint, error: null })
                            })
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({ data: existingBlueprint, error: null })
                                })
                            })
                        })
                    }
                }
                return {}
            })

            // Ensure RPC mock is still set
            mockSupabase.rpc.mockResolvedValue({ data: 'blueprint-123', error: null })

            const result = await mergeCVIntoBlueprint(mockSupabase as any, 'user_123', newCV, 'cv_hash_123')

            expect(result.mergeSummary.newSkills).toBe(1) // Only TypeScript is new
            expect(result.changes.some(c => c.description.includes('TypeScript'))).toBe(true)
        })

        it('should intelligently merge experience with deduplication', async () => {
            const existingBlueprint = {
                id: 'blueprint_123',
                profile_data: {
                    personal: { name: 'John Doe' },
                    contact: {},
                    experience: [{
                        role: 'Developer',
                        company: 'Tech Corp',
                        duration: '2020-2022',
                        confidence: 0.9
                    }],
                    education: [],
                    skills: []
                },
                total_cvs_processed: 1
            }

            const newCV = {
                name: 'John Doe',
                contactInfo: {},
                experience: [
                    { role: 'Developer', company: 'Tech Corp', duration: '2020-2023' }, // Similar, should not duplicate
                    { role: 'Senior Developer', company: 'New Corp', duration: '2023-2024' } // New, should add
                ],
                skills: [],
                education: []
            }

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'cv_blueprints') {
                    return {
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: existingBlueprint, error: null })
                            })
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({ data: existingBlueprint, error: null })
                                })
                            })
                        })
                    }
                }
                return {}
            })

            // Ensure RPC mock is still set
            mockSupabase.rpc.mockResolvedValue({ data: 'blueprint-123', error: null })

            const result = await mergeCVIntoBlueprint(mockSupabase as any, 'user_123', newCV, 'cv_hash_123')

            expect(result.mergeSummary.newExperience).toBe(1) // Only the new Senior Developer role
            expect(result.changes.some(c => c.description.includes('Senior Developer'))).toBe(true)
        })
    })
})
