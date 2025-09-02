import { onMount, onCleanup, createSignal, Show } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { useEdulink } from "../../api/edulink";
import { useToast } from "../toast";
import { VsAccount } from "solid-icons/vs";
import { Transition } from "solid-transition-group";

function Personal(props: {
  setProgress: (value: number) => void;
  progress: () => number;
  theme: string;
}) {
  const [styles, setStyles] = createSignal<{ [key: string]: string } | null>(
    null,
  );
  const edulink = useEdulink();
  const toast = useToast();
  const [sessionData] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "sessionData",
  });
  const [apiUrl] = makePersisted(createSignal<any>(null), {
    storage: sessionStorage,
    name: "apiUrl",
  });

  const [personalData, setPersonalData] = createSignal<any>(null);

  onMount(async () => {
    props.setProgress(0.6);
    const cssModule = await import(
      `../../public/assets/css/${props.theme}/account.module.css`
    );
    const normalized: { [key: string]: string } = {
      ...cssModule.default,
      ...cssModule,
    };
    setStyles(normalized);
    const response = await edulink.getPersonal(
      sessionData()?.user?.id,
      sessionData()?.authtoken,
      apiUrl(),
    );

    if (response.result.success) {
      props.setProgress(0.8);
      setPersonalData(response.result.personal || null);
      props.setProgress(1);
    } else {
      toast.showToast(
        "Error",
        response.result.error ?? "Unknown error",
        "error",
      );
      props.setProgress(0);
    }
  });

  onCleanup(() => {
    props.setProgress(0);
  });

  function getPersonalFields() {
    const p = personalData();
    if (!p) return [];

    const isValid = (v: any) =>
      v !== null &&
      v !== undefined &&
      !(typeof v === "string" && v.trim() === "");

    const rawGroups: [[string, any], [string, any]?][] = [
      [
        ["Address", p.address],
        ["Post Code", p.post_code],
      ],
      [
        ["Gender", p.gender],
        ["Pronouns", p.personal_pronouns],
      ],
      [
        ["Form Group", p.form_group?.name],
        [
          "Form Tutor",
          p.form_group?.employee
            ? `${p.form_group.employee.title} ${p.form_group.employee.forename} ${p.form_group.employee.surname}`
            : null,
        ],
      ],
      [
        ["Year", p.year_group?.name],
        ["Community", p.house_group?.name],
      ],
      [
        ["Email", p.email],
        ["Phone Number", p.phone || p.mobile_phone],
      ],
      [
        ["Admission Date", p.admission_date],
        ["Admission Number", p.admission_number],
      ],
      [
        ["Unique Pupil Number", p.unique_pupil_number],
        ["Unique Learner Number", p.unique_learner_number],
      ],
      [
        ["Date of Birth", p.date_of_birth],
        ["Exam Candidate Number", p.exam_candidate_number],
      ],
      [["Account ID", p.id]],
    ];

    const finalGroups: [string, any][][] = [];
    const leftoverSingles: [string, any][] = [];

    for (const pair of rawGroups) {
      const validFields = pair.filter(
        (item): item is [string, any] => !!item && isValid(item[1]),
      );

      if (validFields.length === 2) {
        finalGroups.push(validFields as [string, any][]);
      } else if (validFields.length === 1) {
        leftoverSingles.push(validFields[0]);
      }
    }

    for (let i = 0; i < leftoverSingles.length; i += 2) {
      const a = leftoverSingles[i];
      const b = leftoverSingles[i + 1];
      finalGroups.push(b ? [a, b] : [a]);
    }

    return finalGroups;
  }

  return (
    <Transition
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 200,
          easing: "ease",
          fill: "forwards",
          composite: "accumulate",
        });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate(
          [{ opacity: 1 }, { opacity: 0 }, { easing: "ease" }],
          {
            duration: 100,
            composite: "accumulate",
          },
        );
        a.finished.then(done);
      }}
    >
      <Show when={props.progress() === 1 && personalData() && styles()}>
        <div class={styles()!["box-container"]}>
          <div class={styles()!["t-container"]}>
            <div class={styles()!["t-personal"]}>
              <div class={styles()!["b-student-info"]}>
                <div class={styles()!["b-student-info__left"]}>
                  <div class={styles()!["l-student-title"]}>
                    <div
                      class={styles()!["__photo"]}
                      style={{
                        "background-image": `url(data:image/*;base64,${
                          sessionData()?.user?.avatar?.photo || ""
                        })`,
                      }}
                    ></div>
                    <div class={styles()!["__title"]}>
                      {sessionData()?.user?.forename +
                        " " +
                        sessionData()?.user?.surname || ""}
                    </div>
                  </div>
                </div>
                <div class={styles()!["b-student-info__right"]}>
                  <div class={styles()!["__content"]}>
                    {getPersonalFields().map((row) => (
                      <div
                        class={`${styles()!["__row"]} ${styles()!["_col-wrap"]}`}
                      >
                        {row.map(([title, data]) => (
                          <div class={styles()!["__col"]}>
                            <div class={styles()!["__title"]}>{title}</div>
                            <div class={styles()!["__data"]}>{data}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </Transition>
  );
}

export default {
  name: "Account",
  icon: () => {
    return <VsAccount size={36} />;
  },
  pos: 11,
  component: Personal,
};
