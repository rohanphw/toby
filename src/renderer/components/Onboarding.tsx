import { createSignal, type JSX } from 'solid-js';
import { ArrowLeft, ArrowRight, Check, Lightbulb, LockKeyhole, PenLine, Search } from 'lucide-solid';
import logo from '../../../resources/toby.png';
import './Onboarding.css';

type OnboardingProps = {
  children: JSX.Element;
  step?: 'profile' | 'subscription' | 'permissions';
};

function IntroScene() {
  return <div class="intro-scene" aria-hidden="true">
    <div class="intro-path intro-path-before"/>
    <div class="intro-path intro-path-after"/>
    <div class="intro-idea">
      <span class="intro-note-icon"><Lightbulb size={19}/></span>
      <span class="intro-note-title">A little idea</span>
      <span class="intro-note-line"/><span class="intro-note-line short"/>
    </div>
    <div class="intro-toby"><img src={logo} alt=""/><span>Toby</span></div>
    <div class="intro-plan">
      <span class="intro-plan-title">Room to make it happen</span>
      <div class="intro-plan-row"><span><Check size={11}/></span><i/></div>
      <div class="intro-plan-row"><span><Check size={11}/></span><i/></div>
      <div class="intro-plan-row"><span><Check size={11}/></span><i/></div>
    </div>
    <div class="intro-helper intro-helper-write"><PenLine size={17}/></div>
    <div class="intro-helper intro-helper-find"><Search size={17}/></div>
  </div>;
}

export function Onboarding(props: OnboardingProps) {
  const [started, setStarted] = createSignal((() => {
    try { return localStorage.getItem('toby:onboarding-started') === 'true'; }
    catch { return false; }
  })());
  let setupTitle: HTMLHeadingElement | undefined;
  let startButton: HTMLButtonElement | undefined;
  const permissions = () => props.step === 'permissions';
  const subscription = () => props.step === 'subscription';
  const stepNumber = () => permissions()?3:subscription()?2:1;

  function start() {
    setStarted(true);
    try { localStorage.setItem('toby:onboarding-started', 'true'); } catch {}
    queueMicrotask(() => setupTitle?.focus());
  }

  function back() {
    setStarted(false);
    try { localStorage.removeItem('toby:onboarding-started'); } catch {}
    queueMicrotask(() => startButton?.focus());
  }

  return <div class="onboarding story-onboarding">
    <section class="welcome-intro" aria-labelledby="welcome-title" hidden={started()}>
      <IntroScene/>
      <h1 id="welcome-title">Meet Toby.<br/>Make room for what matters.</h1>
      <p>A thoughtful teammate for your ideas, plans, and everyday work.</p>
      <button ref={startButton} type="button" class="primary welcome-start" onClick={start}>Get started<ArrowRight size={17}/></button>
    </section>
    <section class="onboarding-setup" aria-labelledby="setup-title" hidden={!started()}>
      <div class="onboarding-card" data-step={props.step??'profile'}>
        <div class="onboarding-setup-top"><button type="button" class="onboarding-back" onClick={back}><ArrowLeft size={14}/>Welcome</button><span class="onboarding-step" aria-label={`Step ${stepNumber()} of 3`}><i class="complete"/><i classList={{ complete: stepNumber()>=2 }}/><i classList={{ complete: permissions() }}/><span>{stepNumber()} of 3</span></span></div>
        <div class="onboarding-setup-heading"><h1 id="setup-title" ref={setupTitle} tabIndex={-1}>{permissions()?'Give Toby room to work':subscription() ? 'Connect your subscription' : 'Make Toby yours'}</h1><p>{permissions()?'Choose how much you want to be involved.':subscription() ? 'Choose how Toby thinks with you.' : 'A name you know. A personality you choose.'}</p></div>
        {props.children}
      </div>
    </section>
    <footer class="onboarding-footer"><LockKeyhole size={11}/><span>Your conversations and workspace stay on your Mac.</span></footer>
  </div>;
}
