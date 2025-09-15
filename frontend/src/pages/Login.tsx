import React, { useState } from "react";
import {
  Box, TextField, Button, Typography, Alert, Link, Container, Paper,
} from "@mui/material";
import { useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAuth } from "@/hooks/useAuth";
import type { LoginRequest, RegisterRequest } from "@/types";


const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

const registerSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  name: yup.string().required('Name is required'),
  tenant_name: yup.string().required('Tenant name is required'),
  role: yup.string().oneOf(['admin', 'compliance_officer', 'surveillance_analyst', 'operations_head', 'auditor']).required('Role is required'),
});

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const {
    register: registerForm,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterRequest>({
    resolver: yupResolver(isLogin ? loginSchema : registerSchema) as any, // resolver matches rendered fields
  });
  

  const onSubmit: SubmitHandler<RegisterRequest> = async (form) => {
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const data: LoginRequest = { email: form.email, password: form.password };
        await login(data);
      } else {
        await register(form); // full register payload
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "An error occurred");
    } finally {
      setLoading(false);
    }
  };
  

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    reset();
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              CompliancePilot
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Compliance-as-Code + Surveillance for SME Brokers
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
            {!isLogin && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Full Name"
                autoComplete="name"
                autoFocus
                {...registerForm('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              autoComplete="email"
              autoFocus={isLogin}
              {...registerForm('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              {...registerForm('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />

            {!isLogin && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="tenant_name"
                  label="Company/Tenant Name"
                  autoComplete="organization"
                  {...registerForm('tenant_name')}
                  error={!!errors.tenant_name}
                  helperText={errors.tenant_name?.message}
                />

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  select
                  id="role"
                  label="Role"
                  SelectProps={{
                    native: true,
                  }}
                  {...registerForm('role')}
                  error={!!errors.role}
                  helperText={errors.role?.message}
                >
                  <option value="">Select a role</option>
                  <option value="admin">Admin</option>
                  <option value="compliance_officer">Compliance Officer</option>
                  <option value="surveillance_analyst">Surveillance Analyst</option>
                  <option value="operations_head">Operations Head</option>
                  <option value="auditor">Auditor</option>
                </TextField>
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={toggleMode}
                sx={{ textDecoration: 'none' }}
              >
                {isLogin
                  ? "Don't have an account? Sign Up"
                  : 'Already have an account? Sign In'}
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
