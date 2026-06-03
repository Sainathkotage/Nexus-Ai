import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { sendInvitationEmail } from './emailService';

export class InvitationService {
  /**
   * Create an email-based or link-based invitation
   */
  async createInvitation(
    projectId: string, 
    invitedByUserId: string, 
    data: { email: string | null; role: 'admin' | 'member' | 'viewer'; message?: string; durationDays?: number }
  ) {
    const supabase = createSupabaseAdminClient();
    
    // Generate secure token and expiry
    const token = crypto.randomUUID();
    const durationMs = (data.durationDays || 7) * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        project_id: projectId,
        email: data.email || null,
        role: data.role,
        invited_by: invitedByUserId,
        token,
        status: 'pending',
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error || !invitation) {
      throw new Error(`Failed to create database invitation: ${error?.message || 'Unknown error'}`);
    }

    // Send email invitation if email is provided
    if (invitation.email) {
      await this.sendInvitationEmail(invitation, data.message || '');
    }

    return invitation;
  }

  /**
   * Helper to fetch data and trigger Resend email notification
   */
  async sendInvitationEmail(invitation: any, personalMessage: string) {
    const supabase = createSupabaseAdminClient();

    // Load project details
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', invitation.project_id)
      .single();

    // Load inviter details
    const { data: inviter } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', invitation.invited_by)
      .single();

    const inviterName = inviter?.username || 'A team member';
    const projectName = project?.name || 'Nexus Project';
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invitation.token}`;

    await sendInvitationEmail(invitation.email, {
      inviterName,
      projectName,
      role: invitation.role,
      message: personalMessage,
      inviteLink
    });
  }

  /**
   * Validate token state and return invite details
   */
  async validateToken(token: string) {
    const supabase = createSupabaseAdminClient();

    const { data: invite, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (error || !invite) {
      throw new Error('Invitation link is invalid.');
    }

    if (invite.status !== 'pending') {
      throw new Error(`Invitation has already been ${invite.status}.`);
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      throw new Error('Invitation has expired.');
    }

    return invite;
  }

  /**
   * Accept invitation, auto-provision user if needed, and insert membership
   */
  async acceptInvitation(
    token: string, 
    userData?: { fullName: string; username: string; password?: string; avatarUrl?: string },
    loggedInUserId?: string
  ) {
    const invite = await this.validateToken(token);
    const supabase = createSupabaseAdminClient();
    let targetUserId = loggedInUserId;

    // 1. If not logged in, auto-create user account
    if (!targetUserId) {
      if (!userData || !userData.password) {
        throw new Error('Account password is required for onboarding setup.');
      }

      const emailToRegister = invite.email;
      if (!emailToRegister) {
        throw new Error('Email is missing from invitation code.');
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailToRegister)
        .maybeSingle();

      if (existingProfile) {
        throw new Error('An account with this email address already exists. Please log in first.');
      }

      // Create new user in Supabase Auth via Admin client (avoids email confirmation block)
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: emailToRegister,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          username: userData.username || userData.fullName,
          name: userData.fullName || userData.username
        }
      });

      if (authErr || !authData.user) {
        throw new Error(`Failed to create onboarding account: ${authErr?.message || 'Unknown error'}`);
      }

      targetUserId = authData.user.id;

      // Update the public profile if the avatar was uploaded
      if (userData.avatarUrl) {
        await supabase
          .from('profiles')
          .update({ avatar: userData.avatarUrl })
          .eq('id', targetUserId);
      }
    }

    // 2. Check if already a member of the project
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', invite.project_id)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!existingMember) {
      // 3. Add to project_members list
      const { error: memberErr } = await supabase
        .from('project_members')
        .insert({
          project_id: invite.project_id,
          user_id: targetUserId,
          role: invite.role || 'member'
        });

      if (memberErr) {
        throw new Error(`Failed to establish project membership: ${memberErr.message}`);
      }
    }

    // 4. Mark invitation as accepted
    const { error: updateErr } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    if (updateErr) {
      throw updateErr;
    }

    return { 
      userId: targetUserId, 
      projectId: invite.project_id 
    };
  }

  /**
   * Revoke invitation
   */
  async revokeInvitation(invitationId: string) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId);

    if (error) {
      throw error;
    }
  }
}

export const invitationService = new InvitationService();
