import { motion } from 'framer-motion';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { Home as HomeIcon, SentimentDissatisfied as SadIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';

export default function NotFound() {
  const theme = useTheme();

  return (
    <Box sx={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      p: 3,
    }}>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <Box sx={{ position: 'relative', mb: 4 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '8rem', md: '12rem' },
              fontWeight: 900,
              background: 'linear-gradient(135deg, #6C63FF, #14B8A6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
            }}
          >
            404
          </Typography>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <SadIcon sx={{ fontSize: 60, color: theme.palette.mode === 'dark' ? '#ffffff33' : '#00000022' }} />
          </motion.div>
        </Box>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>Page Not Found</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </Typography>
        <Button
          component={Link}
          to="/"
          variant="contained"
          startIcon={<HomeIcon />}
          size="large"
          sx={{
            borderRadius: 3,
            py: 1.5,
            px: 4,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6C63FF, #8b5cf6)',
          }}
        >
          Back to Home
        </Button>
      </motion.div>
    </Box>
  );
}
