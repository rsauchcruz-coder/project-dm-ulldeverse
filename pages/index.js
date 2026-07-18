export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/index-static.html",
      permanent: false,
    },
  };
}

export default function Home() {
  return null;
}
