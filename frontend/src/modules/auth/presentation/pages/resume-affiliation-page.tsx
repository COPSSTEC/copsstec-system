import { ResumeAffiliationForm } from "@/modules/auth/presentation/forms/resume-affiliation-form";
import { AuthScene } from "@/shared/components/auth-scene";

export function ResumeAffiliationPage() {
  return (
    <AuthScene>
      <section className="login-glass-card login-glass-card-narrow">
        <h1>Continuar afiliación</h1>
        <p className="login-subtitle">
          Ingresa el correo con el que te inscribiste. Te enviaremos un código para retomar el pago
          o los documentos.
        </p>
        <ResumeAffiliationForm />
      </section>
    </AuthScene>
  );
}
