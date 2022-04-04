import { useContext, useEffect, useState } from "react";
import BackendService from "../../lib/database/backendService";
import { Post } from "../../lib/database/data/post";
import CreatePostView from "../../components/CreatePostView";
import Button from "../../components/Button";
import { SocketContext } from "../../lib/contexts/SocketContext";
import { useRouter } from "next/router";
import { parseCookies } from "../../helpers";
import { Account } from "../../lib/database/data/account";
import { useCookies } from "react-cookie";
import PostFeed from "../../components/PostFeed";
import { BackendServiceContext } from "../../lib/contexts/BackendServiceContext";

export async function getServerSideProps({ req }) {
  const cookies = parseCookies(req);
  const bearerToken = cookies.bearerToken;

  const backendService = new BackendService(
    process.env.NEXT_PUBLIC_REACT_APP_BACKEND_URL!,
    Number.parseInt(process.env.NEXT_PUBLIC_REACT_APP_BACKEND_PORT!)
  );

  const account = await backendService.getAccount(bearerToken);
  if (!account) {
    return {
      redirect: {
        permanent: false,
        destination: "/login",
      },
    };
  }

  return {
    props: { account },
  };
}

export default function HomePage(props: { account: Account }) {
  const [cookie, setCookie, removeCookie] = useCookies(["bearerToken"]);

  const backendService = useContext(BackendServiceContext);

  const [posts, setPosts] = useState<Post[]>([]);

  const socket = useContext(SocketContext);

  let router = useRouter();

  useEffect(() => {
    backendService
      .getAllPosts(cookie.bearerToken)
      .then((posts) => setPosts(posts));
  }, [backendService, cookie.bearerToken]);

  useEffect(() => {
    socket.on("posts", (post: Post) => {
      post.createdAt = new Date(post.createdAt);

      const postsCopy = posts !== undefined ? [...posts] : [];
      postsCopy.push(post);
      setPosts(postsCopy);
    });
    return () => {
      socket.off("posts");
    };
  }, [posts, socket]);

  return (
    <div className="flex justify-center min-h-screen">
      <div className="m-5 mt-10 max-w-4xl w-full flex flex-col justify-between">
        <div>
          <h1 className="text-center text-5xl font-extrabold">Feed</h1>
          <CreatePostView></CreatePostView>
          <PostFeed account={props.account} posts={posts} />
        </div>
        <Button
          onClickHandler={async () => {
            removeCookie("bearerToken");
            router.push("/login");
          }}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
