import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Box,
    Container,
    Typography,
    TextField,
    Button,
    Grid,
    Card,
    CardContent,
    Paper,
    Alert,
    useMediaQuery,
    useTheme
} from '@mui/material';
import {
    Email as EmailIcon,
    Phone as PhoneIcon,
    LocationOn as LocationIcon,
    Send as SendIcon,
} from '@mui/icons-material';

function ContactUs() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const contactInfo = [
        {
            icon: <EmailIcon sx={{ fontSize: 40, color: '#6C63FF' }} />,
            title: 'Email',
            content: 'milankatariya9774@gmail.com',
            subtext: 'We reply within 24 hours',
        },
        {
            icon: <PhoneIcon sx={{ fontSize: 40, color: '#6C63FF' }} />,
            title: 'Phone',
            content: '+91 7283963991',
            subtext: 'Mon-Fri, 9AM-6PM EST',
        },
        {
            icon: <LocationIcon sx={{ fontSize: 40, color: '#6C63FF' }} />,
            title: 'Location',
            content: 'Surat, Gujarat, India',
            subtext: 'Visit us by appointment',
        },
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Simulating API call - replace with actual backend endpoint
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Form submitted:', formData);
            setSubmitted(true);
            setFormData({ name: '', email: '', subject: '', message: '' });

            // Hide success message after 5 seconds
            setTimeout(() => setSubmitted(false), 5000);
        } catch (error) {
            console.error('Failed to submit form:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ py: { xs: 4, md: 8 }, bgcolor: '#f5f7fa', minHeight: '90vh' }}>
            <Container maxWidth="lg">
                {/* Hero Section */}
                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 8 } }}>
                        <Typography
                            variant={{ xs: 'h4', md: 'h3' }}
                            component="h1"
                            sx={{
                                fontWeight: 700,
                                mb: 3,
                                color: '#1a1a2e',
                            }}
                        >
                            Get in Touch
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: '#666',
                                maxWidth: '600px',
                                mx: 'auto',
                                lineHeight: 1.8,
                                fontSize: { xs: '0.9rem', sm: '1rem' }
                            }}
                        >
                            Have a question or feedback? We'd love to hear from you. Contact us using the form below
                            or reach out through any of our other channels.
                        </Typography>
                    </Box>
                </motion.div>

                {/* Contact Information Cards */}
                <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 4, md: 8 } }}>
                    {contactInfo.map((info, index) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                                whileHover={{ y: -8 }}
                            >
                                <Card
                                    sx={{
                                        height: '100%',
                                        textAlign: 'center',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        borderRadius: 2,
                                        p: { xs: 2, md: 3 },
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            boxShadow: '0 8px 16px rgba(108, 99, 255, 0.15)',
                                        },
                                    }}
                                >
                                    <Box sx={{ mb: 2 }}>
                                        {info.icon}
                                    </Box>
                                    <CardContent sx={{ p: { xs: 1, md: 0 } }}>
                                        <Typography
                                            variant={{ xs: 'subtitle2', md: 'h6' }}
                                            sx={{
                                                fontWeight: 700,
                                                mb: 1,
                                                color: '#1a1a2e',
                                                fontSize: { xs: '1rem', md: '1.25rem' }
                                            }}
                                        >
                                            {info.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 600,
                                                color: '#6C63FF',
                                                mb: 0.5,
                                                fontSize: { xs: '0.85rem', sm: '0.95rem' }
                                            }}
                                        >
                                            {info.content}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                                            {info.subtext}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>

                {/* Contact Form */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2.5, md: 6 },
                            bgcolor: 'white',
                            borderRadius: 2,
                            maxWidth: '700px',
                            mx: 'auto',
                        }}
                    >
                        {submitted && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                                <Alert severity="success" sx={{ mb: 3 }}>
                                    Thank you for your message! We'll get back to you soon.
                                </Alert>
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <Grid container spacing={{ xs: 2, md: 3 }}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Full Name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        variant="outlined"
                                        size="small"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    transition: 'all 0.3s ease',
                                                    '&:focus-within': {
                                                        transform: 'translateY(-2px)',
                                                    },
                                                    '&:focus-within fieldset': {
                                                        borderColor: '#6C63FF',
                                                    },
                                                },
                                            }}
                                        />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Email Address"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        variant="outlined"
                                        size="small"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    transition: 'all 0.3s ease',
                                                    '&:focus-within': {
                                                        transform: 'translateY(-2px)',
                                                    },
                                                    '&:focus-within fieldset': {
                                                        borderColor: '#6C63FF',
                                                    },
                                                },
                                            }}
                                        />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        label="Subject"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        required
                                        variant="outlined"
                                        size="small"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    transition: 'all 0.3s ease',
                                                    '&:focus-within': {
                                                        transform: 'translateY(-2px)',
                                                    },
                                                    '&:focus-within fieldset': {
                                                        borderColor: '#6C63FF',
                                                    },
                                                },
                                            }}
                                        />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        label="Message"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        required
                                        multiline
                                        rows={5}
                                        variant="outlined"
                                        size="small"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    transition: 'all 0.3s ease',
                                                    '&:focus-within': {
                                                        transform: 'translateY(-2px)',
                                                    },
                                                    '&:focus-within fieldset': {
                                                        borderColor: '#6C63FF',
                                                    },
                                                },
                                            }}
                                        />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Button
                                            type="submit"
                                            fullWidth
                                            variant="contained"
                                            size="large"
                                            disabled={loading}
                                            sx={{
                                                bgcolor: '#6C63FF',
                                                color: 'white',
                                                fontWeight: 700,
                                                py: { xs: 1.2, sm: 1.5 },
                                                fontSize: { xs: 14, sm: 16 },
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    bgcolor: '#5B4FD1',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 6px 20px rgba(108, 99, 255, 0.4)'
                                                }
                                            }}
                                            startIcon={<SendIcon />}
                                        >
                                            {loading ? 'Sending...' : 'Send Message'}
                                        </Button>
                                </Grid>
                            </Grid>
                        </form>

                        <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid #e0e0e0' }}>
                            <Typography variant={{ xs: 'caption', sm: 'subtitle2' }} sx={{ color: '#666', mb: 2, display: 'block', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                Quick Response Times
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                                Our support team typically responds to all inquiries within 24 hours. For urgent matters,
                                please call us directly at the number provided above.
                            </Typography>
                        </Box>
                    </Paper>
                </motion.div>
            </Container>
        </Box>
    );
}

export default ContactUs;
