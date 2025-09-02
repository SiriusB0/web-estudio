import { supabase } from './supabaseClient';

export interface InvitationCode {
  id: string;
  code: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  is_active: boolean;
}

// Verificar si el usuario actual es admin
export const isAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    // Verificar si el usuario tiene is_admin = true
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error verificando admin:', error);
      return false;
    }
    
    return profile?.is_admin === true;
  } catch (error) {
    console.error('Error verificando admin:', error);
    return false;
  }
};

// Generar nuevo código de invitación (solo admin)
export const generateInvitationCode = async (): Promise<{ code: string; expires_at: string } | null> => {
  try {
    const { data, error } = await supabase.rpc('create_invitation_code');
    
    if (error) {
      console.error('Error generando código:', error);
      throw new Error(error.message);
    }
    
    if (data && data.length > 0) {
      return {
        code: data[0].code,
        expires_at: data[0].expires_at
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error en generateInvitationCode:', error);
    throw error;
  }
};

// Obtener códigos activos del admin
export const getActiveInvitationCodes = async (): Promise<InvitationCode[]> => {
  try {
    const { data, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error obteniendo códigos:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error en getActiveInvitationCodes:', error);
    throw error;
  }
};

// Obtener historial completo de códigos (activos y usados)
export const getAllInvitationCodes = async (): Promise<InvitationCode[]> => {
  try {
    const { data, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error obteniendo historial:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error en getAllInvitationCodes:', error);
    throw error;
  }
};

// Obtener el ID del creador de un código de invitación (para clonación)
export const getInvitationCodeCreator = async (code: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('get_invitation_code_creator', {
      invitation_code: code
    });

    if (error) {
      console.error('Error obteniendo creador del código:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en getInvitationCodeCreator:', error);
    return null;
  }
};

// Validar código de invitación (para registro)
export const validateInvitationCode = async (code: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('validate_invitation_code', {
      invitation_code: code
    });
    
    if (error) {
      console.error('Error validando código:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error en validateInvitationCode:', error);
    return false;
  }
};

// Marcar código como usado (después de registro exitoso)
export const markInvitationCodeAsUsed = async (code: string, userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('use_invitation_code', {
      invitation_code: code,
      user_id: userId
    });
    
    if (error) {
      console.error('Error marcando código como usado:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error en markInvitationCodeAsUsed:', error);
    return false;
  }
};

// Formatear fecha para mostrar
export const formatExpirationDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffMs < 0) {
    return 'Expirado';
  } else if (diffHours < 1) {
    return `${diffMinutes}m restantes`;
  } else if (diffHours < 24) {
    return `${diffHours}h ${diffMinutes}m restantes`;
  } else {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// Obtener estado del código
export const getCodeStatus = (code: InvitationCode): 'active' | 'used' | 'expired' => {
  if (code.used_at) {
    return 'used';
  } else if (new Date(code.expires_at) < new Date()) {
    return 'expired';
  } else {
    return 'active';
  }
};

// Copiar código al portapapeles
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error copiando al portapapeles:', error);
    return false;
  }
};
