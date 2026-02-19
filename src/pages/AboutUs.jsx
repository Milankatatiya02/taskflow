import { motion } from 'framer-motion';
import { Box, Container, Typography, Grid, Card, CardContent, Paper, useMediaQuery, useTheme } from '@mui/material';
import {
    Group as GroupIcon,
    Lightbulb as IdeaIcon,
    Rocket as RocketIcon,
    Security as SecurityIcon
} from '@mui/icons-material';

function AboutUs() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const values = [
        {
            icon: <IdeaIcon sx={{ fontSize: 40, color: '#6C63FF' }} />,
            title: 'Innovation',
            description: 'We constantly innovate to provide the best task management solutions for modern teams.',
        },
        {
            icon: <GroupIcon sx={{ fontSize: 40, color: '#6C63FF' }} />,
            title: 'Collaboration',
            description: 'Enabling seamless collaboration and communication within your team.',
        },
        {
            icon: <RocketIcon sx={{ fontSize: 40, color: '#6C63FF' }} />,
            title: 'Productivity',
            description: 'Boosting productivity by simplifying task management and workflow automation.',
        },
        {
            icon: <SecurityIcon sx={{ fontSize: 40, color: '#6C63FF' }} />,
            title: 'Security',
            description: 'Protecting your data with state-of-the-art security measures and privacy standards.',
        },
    ];

    return (
        <Box sx={{ py: { xs: 4, md: 8 }, bgcolor: '#f5f7fa' }}>
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
                            About TaskFlow
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
                            Streamline your workflow, boost your productivity, and collaborate seamlessly with your team.
                            TaskFlow is the ultimate task management solution designed for modern teams.
                        </Typography>
                    </Box>
                </motion.div>

                {/* Our Mission */}
                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2.5, md: 4 },
                            mb: { xs: 4, md: 8 },
                            bgcolor: 'white',
                            borderRadius: 2,
                        }}
                    >
                        <Grid container spacing={{ xs: 2, md: 4 }} alignItems="center">
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Typography
                                    variant={{ xs: 'h5', md: 'h4' }}
                                    sx={{
                                        fontWeight: 700,
                                        mb: 2,
                                        color: '#1a1a2e',
                                    }}
                                >
                                    Our Mission
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: '#666',
                                        lineHeight: 1.8,
                                        mb: 2,
                                        fontSize: { xs: '0.85rem', sm: '1rem' }
                                    }}
                                >
                                    We believe that effective task management is the foundation of successful projects.
                                    Our mission is to provide an intuitive, powerful, and accessible platform that helps
                                    individuals and teams organize their work, track progress, and achieve their goals.
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: '#666',
                                        lineHeight: 1.8,
                                        fontSize: { xs: '0.85rem', sm: '1rem' }
                                    }}
                                >
                                    With TaskFlow, you can focus on what matters most while we handle the complexity
                                    of task management.
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: { xs: '200px', md: '300px' },
                                            bgcolor: '#f0f0f5',
                                            borderRadius: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Typography variant="body2" color="textSecondary">
                                            [Mission Illustration]
                                        </Typography>
                                    </Box>
                                </motion.div>
                            </Grid>
                        </Grid>
                    </Paper>
                </motion.div>

                {/* Our Values */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }}>
                    <Box sx={{ mb: { xs: 4, md: 8 } }}>
                        <Typography
                            variant={{ xs: 'h5', md: 'h4' }}
                            sx={{
                                fontWeight: 700,
                                mb: { xs: 3, md: 6 },
                                color: '#1a1a2e',
                                textAlign: 'center',
                            }}
                        >
                            Our Core Values
                        </Typography>
                        <Grid container spacing={{ xs: 2, md: 3 }}>
                            {values.map((value, index) => (
                                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
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
                                                {value.icon}
                                            </Box>
                                            <CardContent sx={{ p: { xs: 1, md: 0 } }}>
                                                <Typography
                                                    variant={{ xs: 'subtitle2', md: 'h6' }}
                                                    sx={{
                                                        fontWeight: 700,
                                                        mb: 1,
                                                        color: '#1a1a2e',
                                                    }}
                                                >
                                                    {value.title}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                                                    {value.description}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </motion.div>

                {/* Team Section */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2.5, md: 4 },
                            bgcolor: 'white',
                            borderRadius: 2,
                        }}
                    >
                        <Typography
                            variant={{ xs: 'h5', md: 'h4' }}
                            sx={{
                                fontWeight: 700,
                                mb: 3,
                                color: '#1a1a2e',
                                textAlign: 'center',
                            }}
                        >
                            Why Choose TaskFlow?
                        </Typography>
                        <Grid container spacing={{ xs: 1.5, md: 2 }}>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#6C63FF', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                                    Easy to Use
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                                    Intuitive interface that requires minimal learning curve. Get started in minutes.
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#6C63FF', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                                    Powerful Features
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                                    Comprehensive tools for task management, tracking, and team collaboration.
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#6C63FF', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                                    Real-time Updates
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                                    Live updates ensure your team stays synchronized at all times.
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>
                </motion.div>
            </Container>
        </Box>
    );
}

export default AboutUs;
